import { address, randomSeed, publicKey } from '@waves/ts-lib-crypto';
import {
  data,
  massTransfer,
  issue,
} from '@waves/waves-transactions';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

import {
  api, apiBase, waitForTx, chainId,
} from '../../utils/api.mjs';

const seed = 'waves private node seed with waves tokens';
const seedWordsCount = 5;
const ridePath = '../ride';
const l2mpStakingPath = format({ dir: ridePath, base: 'l2mp_staking.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'l2mpStaking',
      'admin1',
      'admin2',
      'admin3',
      'user1',
      'user2',
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
    }, seed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });

    const issueAsset = issue({
      quantity: 1000000_0000_0000,
      decimals: 8,
      name: 'L2MP',
      description: 'Mining Power Token for WAVES EVM L2 bootstrapping.',
      chainId,
    }, this.accounts.l2mpStaking.seed);

    this.l2mpAssetId = issueAsset.id;

    await api.transactions.broadcast(issueAsset, {});
    await waitForTx(issueAsset.id, { apiBase });

    const massTransferAssetTx = massTransfer({
      transfers: Object.values(this.accounts).map((item) => ({ recipient: item.addr, amount })),
      chainId,
      assetId: issueAsset.id,
    }, this.accounts.l2mpStaking.seed);
    await api.transactions.broadcast(massTransferAssetTx, {});
    await waitForTx(massTransferAssetTx.id, { apiBase });

    await setScriptFromFile(l2mpStakingPath, this.accounts.l2mpStaking.seed);

    // const adminsListString = [
    //   this.accounts.admin1.addr,
    //   this.accounts.admin2.addr,
    //   this.accounts.admin3.addr,
    // ].join('__');

    const dataTx = data({
      additionalFee: 4e5,
      data: [
        // {
        //   key: '%s__adminAddressList',
        //   type: 'string',
        //   value: adminsListString,
        // },
        {
          key: '%s__assetId',
          type: 'string',
          value: this.l2mpAssetId,
        },
        {
          key: '%s__emissionPeriodInBlocks',
          type: 'integer',
          value: 1,
        },
      ],
      chainId,
    }, this.accounts.l2mpStaking.seed);

    await api.transactions.broadcast(dataTx, {});
    await waitForTx(dataTx.id, { apiBase });
  },
};
