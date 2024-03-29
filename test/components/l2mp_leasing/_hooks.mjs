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
const l2mpLeasingPath = format({ dir: ridePath, base: 'l2mp_leasing.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'l2mpLeasing',
      'admin1',
      'admin2',
      'user1',
      'user2',
      'node1',
      'node2',
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

    const issueAsset = issue({
      quantity: 1000000_0000_0000,
      decimals: 8,
      name: 'L2MP',
      description: 'Mining Power Token for WAVES EVM L2 bootstrapping.',
      chainId,
    }, this.accounts.l2mpLeasing.seed);

    this.l2mpAssetId = issueAsset.id;

    await broadcastAndWait(issueAsset);

    const massTransferAssetTx = massTransfer({
      transfers: Object.values(this.accounts).map((item) => ({ recipient: item.addr, amount })),
      chainId,
      assetId: issueAsset.id,
    }, this.accounts.l2mpLeasing.seed);
    await broadcastAndWait(massTransferAssetTx);

    await setScriptFromFile(l2mpLeasingPath, this.accounts.l2mpLeasing.seed);

    const adminsListString = [
      this.accounts.admin1.addr,
      this.accounts.admin2.addr,
    ].join('__');

    const dataTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__adminAddressList',
          type: 'string',
          value: adminsListString,
        },
        {
          key: '%s__assetId',
          type: 'string',
          value: this.l2mpAssetId,
        },
      ],
      chainId,
    }, this.accounts.l2mpLeasing.seed);

    await broadcastAndWait(dataTx);
  },
};
