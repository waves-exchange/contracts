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
const mptStakingPath = format({ dir: ridePath, base: 'mpt_staking.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'mptStaking',
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
      name: 'MPT2',
      description: 'MPT asset',
      chainId,
    }, this.accounts.mptStaking.seed);

    this.mptAssetId = issueAsset.id;

    await api.transactions.broadcast(issueAsset, {});
    await waitForTx(issueAsset.id, { apiBase });

    const massTransferAssetTx = massTransfer({
      transfers: Object.values(this.accounts).map((item) => ({ recipient: item.addr, amount })),
      chainId,
      assetId: issueAsset.id,
    }, this.accounts.mptStaking.seed);
    await api.transactions.broadcast(massTransferAssetTx, {});
    await waitForTx(massTransferAssetTx.id, { apiBase });

    await setScriptFromFile(mptStakingPath, this.accounts.mptStaking.seed);

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
          value: this.mptAssetId,
        },
      ],
      chainId,
    }, this.accounts.mptStaking.seed);

    await api.transactions.broadcast(dataTx, {});
    await waitForTx(dataTx.id, { apiBase });
  },
};
