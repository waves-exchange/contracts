import { address, randomSeed, publicKey } from '@waves/ts-lib-crypto';
import {
  data,
  massTransfer,
  issue,
  transfer,
} from '@waves/waves-transactions';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

import {
  broadcastAndWait, chainId, baseSeed,
} from '../../utils/api.mjs';

const seedWordsCount = 5;
const ridePath = '../ride';
const mockPath = 'components/l2mp_swap/mock';
const l2mpSwapPath = format({ dir: ridePath, base: 'l2mp_swap.ride' });
const l2mpStakingMockPath = format({ dir: mockPath, base: 'l2mp_staking.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'l2mpSwap',
      'l2mpStaking',
      'admin1',
      'admin2',
      'admin3',
      'user1',
      'user2',
      'node1',
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

    this.l2mpAssetId = await broadcastAndWait(issue({
      quantity: 1e6 * 1e8,
      decimals: 8,
      name: 'L2MP',
      description: 'Mining Power Token for WAVES EVM L2 bootstrapping.',
      chainId,
    }, baseSeed)).then((tx) => tx.id);

    this.xtnAssetId = await broadcastAndWait(issue({
      quantity: 1e6 * 1e6,
      decimals: 6,
      name: 'XTN.',
      description: '',
      chainId,
    }, baseSeed)).then((tx) => tx.id);

    await broadcastAndWait(transfer({
      recipient: this.accounts.l2mpSwap.addr,
      amount: 1e6 * 1e8,
      assetId: this.l2mpAssetId,
      chainId,
    }, baseSeed));

    await broadcastAndWait(massTransfer({
      transfers: Object.values(this.accounts).map((item) => ({ recipient: item.addr, amount })),
      chainId,
      assetId: this.xtnAssetId,
    }, baseSeed));

    await broadcastAndWait(data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__assetInId',
          type: 'string',
          value: this.xtnAssetId,
        },
        {
          key: '%s__assetOutId',
          type: 'string',
          value: this.l2mpAssetId,
        },
        {
          key: '%s__assetOutPrice',
          type: 'integer',
          value: 1e6,
        },
        {
          key: '%s__stakingAddress',
          type: 'string',
          value: this.accounts.l2mpStaking.addr,
        },
      ],
      chainId,
    }, this.accounts.l2mpSwap.seed));

    await setScriptFromFile(l2mpSwapPath, this.accounts.l2mpSwap.seed);
    await setScriptFromFile(l2mpStakingMockPath, this.accounts.l2mpStaking.seed);
  },
};
