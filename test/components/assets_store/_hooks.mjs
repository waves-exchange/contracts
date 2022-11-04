import { address, randomSeed } from '@waves/ts-lib-crypto';
import { massTransfer, nodeInteraction } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import ora from 'ora';
import { setScriptFromFile } from '../../utils/utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = '../ride';
const testPath = 'common_mock';
const assetsStorePath = format({ dir: ridePath, base: 'assets_store.ride' });
const userPoolsMockPath = format({ dir: testPath, base: 'user_pools.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const spinner = ora('Initializing').start();
    // setup accounts
    const names = ['store', 'pools', 'user'];
    this.accounts = Object.fromEntries(names.map((item) => [item, randomSeed(seedWordsCount)]));
    const seeds = Object.values(this.accounts);
    const amount = 1e10;
    const massTransferTx = massTransfer({
      transfers: seeds.map((item) => ({ recipient: address(item, chainId), amount })),
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });
    // set scripts
    await setScriptFromFile(assetsStorePath, this.accounts.store);
    await setScriptFromFile(userPoolsMockPath, this.accounts.pools);
    spinner.succeed('Initialized');
  },
};
