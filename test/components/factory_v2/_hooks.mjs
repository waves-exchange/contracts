import { address, randomSeed } from '@waves/ts-lib-crypto';
import {
  data, issue, massTransfer, nodeInteraction,
} from '@waves/waves-transactions';
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
const mockPath = 'components/factory_v2/mocks';
const factoryV2Path = format({ dir: ridePath, base: 'factory_v2.ride' });
const assetsStoreMockPath = format({ dir: testPath, base: 'assets_store.mock.ride' });
const lpMockPath = format({ dir: testPath, base: 'lp.mock.ride' });
const userpoolsMockPath = format({ dir: mockPath, base: 'user_pools.ride' });
const votingEmissionMockPath = format({ dir: mockPath, base: 'voting_emission.ride' });

export const mochaHooks = {
  async beforeAll() {
    const spinner = ora('Initializing').start();
    // setup accounts
    const names = ['factory', 'store', 'lp', 'matcher', 'user', 'userpools', 'voting_emission'];
    this.accounts = Object.fromEntries(names.map((item) => [item, randomSeed(seedWordsCount)]));
    const seeds = Object.values(this.accounts);
    const amount = 1e10;
    const massTransferTx = massTransfer({
      transfers: seeds.map((item) => ({ recipient: address(item, chainId), amount })),
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });

    const dataTx = data({
      data: [
        {
          key: '%s__userPoolsContract',
          type: 'string',
          value: address(this.accounts.userpools, chainId),
        },
        {
          key: '%s__votingEmissionContract',
          type: 'string',
          value: address(this.accounts.voting_emission, chainId),
        },
      ],
      chainId,
    }, this.accounts.factory);

    await api.transactions.broadcast(dataTx, {});
    await waitForTx(dataTx.id, { apiBase });

    // set scripts
    await setScriptFromFile(factoryV2Path, this.accounts.factory);
    await setScriptFromFile(assetsStoreMockPath, this.accounts.store);
    await setScriptFromFile(lpMockPath, this.accounts.lp);
    await setScriptFromFile(userpoolsMockPath, this.accounts.userpools);
    await setScriptFromFile(votingEmissionMockPath, this.accounts.voting_emission);

    // issue USDN asset
    const usdnIssueTx = issue({
      name: 'USDN',
      description: '',
      quantity: 1e16,
      decimals: 6,
      chainId,
    }, seed);
    await api.transactions.broadcast(usdnIssueTx, {});
    await waitForTx(usdnIssueTx.id, { apiBase });
    this.usdnAssetId = usdnIssueTx.id;

    spinner.succeed('Initialized');
  },
};
