import { address, randomSeed } from '@waves/ts-lib-crypto';
import {
  data,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import ora from 'ora';
import { setScriptFromFile } from '../utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
const testPath = 'test';
const userPoolsPath = format({ dir: ridePath, base: 'user_pools.ride' });
const assetsStoreMockPath = format({ dir: testPath, base: 'assets_store.mock.ride' });
const factoryV2MockPath = format({ dir: testPath, base: 'factory_v2.mock.ride' });
const lpMockPath = format({ dir: testPath, base: 'lp.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const spinner = ora('Initializing').start();
    // setup accounts
    const names = ['pools', 'store', 'factory', 'lp', 'user'];
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
    await setScriptFromFile(userPoolsPath, this.accounts.pools);
    await setScriptFromFile(assetsStoreMockPath, this.accounts.store);
    await setScriptFromFile(factoryV2MockPath, this.accounts.factory);
    await setScriptFromFile(lpMockPath, this.accounts.lp);

    // issue WX asset
    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(wxIssueTx, {});
    await waitForTx(wxIssueTx.id, { apiBase });
    this.wxAssetId = wxIssueTx.id;

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

    const setPriceAssetsTx = data({
      dApp: address(this.accounts.factory, chainId),
      additionalFee: 4e5,
      data: [{
        key: '%s__priceAssets',
        type: 'string',
        value: this.usdnAssetId,
      }],
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(setPriceAssetsTx, {});
    await waitForTx(setPriceAssetsTx.id, { apiBase });

    spinner.succeed('Initialized');
  },
};
