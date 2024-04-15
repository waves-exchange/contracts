import { address, randomSeed, publicKey } from '@waves/ts-lib-crypto';
import {
  data,
  massTransfer,
} from '@waves/waves-transactions';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

import {
  broadcastAndWait, chainId, baseSeed,
} from '../../utils/api.mjs';

const seedWordsCount = 5;
const ridePath = '../ride';
const forceStopPath = format({ dir: ridePath, base: 'forcestop.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'forceStop',
      'admin1',
      'admin2',
      'user1',
      'dapp1',
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

    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__forceStopPermission',
          type: 'string',
          value: `${this.accounts.admin1.addr}__${this.accounts.admin2.addr}`,
        },
      ],
      chainId,
    }, this.accounts.forceStop.seed));

    await setScriptFromFile(forceStopPath, this.accounts.forceStop.seed);
  },
};
