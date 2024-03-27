import { address, randomSeed, publicKey } from '@waves/ts-lib-crypto';
import {
  data,
  massTransfer,
  issue,
} from '@waves/waves-transactions';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

import {
  broadcastAndWait, chainId, baseSeed,
} from '../../utils/api.mjs';

const seedWordsCount = 5;
const ridePath = '../ride';
const mockPath = 'components/wxdao_funding/mock';
const wxdaoFundingPath = format({ dir: ridePath, base: 'wxdao_funding.ride' });
const wxdaoMockPath = format({ dir: mockPath, base: 'wxdao.mock.ride' });
const poolMockPath = format({ dir: mockPath, base: 'pool.mock.ride' });
const mainTreasury = format({ dir: mockPath, base: 'mainTreasury.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'wxdaoFunding',
      'wxdao',
      'mainTreasury',
      'wavesUsdtPool',
      'user1',
    ];
    this.accounts = Object.fromEntries(names.map((item) => {
      const itemSeed = randomSeed(seedWordsCount);
      return [
        item,
        { seed: itemSeed, addr: address(itemSeed, chainId), publicKey: publicKey(itemSeed) },
      ];
    }));
    const amount = 100e8;
    const massTransferTx = massTransfer({
      transfers: Object.values(this.accounts).map((item) => ({ recipient: item.addr, amount })),
      chainId,
    }, baseSeed);
    await broadcastAndWait(massTransferTx);

    this.wxdaoAssetId = await broadcastAndWait(issue({
      quantity: 1e6 * 1e8,
      decimals: 8,
      name: 'WXDAO',
      description: 'WXDAO',
      chainId,
    }, baseSeed)).then((tx) => tx.id);

    await broadcastAndWait(massTransfer({
      transfers: Object.values(this.accounts).map((item) => ({ recipient: item.addr, amount })),
      chainId,
      assetId: this.wxdaoAssetId,
    }, baseSeed));

    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__mainTreasuryAddress',
          type: 'string',
          value: this.accounts.mainTreasury.addr,
        },
        {
          key: '%s__WavesUSDTPoolAddress',
          type: 'string',
          value: this.accounts.wavesUsdtPool.addr,
        },
        {
          key: '%s__WXDAOcontractAddress',
          type: 'string',
          value: this.accounts.wxdao.addr,
        },
        {
          key: '%s__WXDAOassetId',
          type: 'string',
          value: this.wxdaoAssetId,
        },
        {
          key: '%s__USDTassetId',
          type: 'string',
          value: 'MOCKED_USDT_ASSET_ID',
        },
      ],
      chainId,
    }, this.accounts.wxdaoFunding.seed));

    await setScriptFromFile(wxdaoFundingPath, this.accounts.wxdaoFunding.seed);
    await setScriptFromFile(wxdaoMockPath, this.accounts.wxdao.seed);
    await setScriptFromFile(poolMockPath, this.accounts.wavesUsdtPool.seed);
    await setScriptFromFile(mainTreasury, this.accounts.mainTreasury.seed);
  },
};
