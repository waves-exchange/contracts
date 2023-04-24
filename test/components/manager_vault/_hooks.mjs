import { address, randomSeed } from '@waves/ts-lib-crypto';
import {
  data,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = '../ride';
const managerVaultPath = format({ dir: ridePath, base: 'manager_vault.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'managerVault',
      'manager1',
      'manager2',
      'admin1',
      'admin2',
      'admin3',
      'user1',
    ];
    this.accounts = Object.fromEntries(names.map((item) => [item, randomSeed(seedWordsCount)]));
    const seeds = Object.values(this.accounts);
    const amount = 100e8;
    const massTransferTx = massTransfer({
      transfers: seeds.map((item) => ({ recipient: address(item, chainId), amount })),
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });

    await setScriptFromFile(managerVaultPath, this.accounts.managerVault);

    const adminsListString = [
      address(this.accounts.admin1, chainId),
      address(this.accounts.admin2, chainId),
      address(this.accounts.admin3, chainId),
    ].join('__');
    const setAdminsTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__adminAddressList',
          type: 'string',
          value: adminsListString,
        },
      ],
      chainId,
    }, this.accounts.managerVault);
    await api.transactions.broadcast(setAdminsTx, {});
    await waitForTx(setAdminsTx.id, { apiBase });
  },
};
