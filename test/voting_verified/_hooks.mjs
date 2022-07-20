import { address, randomSeed } from '@waves/ts-lib-crypto';
import { issue, massTransfer, nodeInteraction } from '@waves/waves-transactions';
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
const votingVerifiedPath = format({ dir: ridePath, base: 'voting_verified.ride' });
const assetsStoreMockPath = format({ dir: testPath, base: 'assets_store.mock.ride' });
const boostingMockPath = format({ dir: testPath, base: 'boosting.mock.ride' });
const emissionMockPath = format({ dir: testPath, base: 'emission.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const spinner = ora('Initializing').start();
    this.votingDuration = 6;
    // setup accounts
    const contractNames = ['voting', 'boosting', 'emission', 'store'];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
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
    // await setScriptFromFile(votingVerifiedPath, this.accounts.voting, (content) => content
    // .replace('assetId.eliminationCheck()', 'true'));
    await setScriptFromFile(votingVerifiedPath, this.accounts.voting);
    await setScriptFromFile(assetsStoreMockPath, this.accounts.store);
    await setScriptFromFile(boostingMockPath, this.accounts.boosting);
    await setScriptFromFile(emissionMockPath, this.accounts.emission);
    // issue WX asset
    const issueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 3e16,
      decimals: 8,
      chainId,
    }, this.accounts.voting);
    await api.transactions.broadcast(issueTx, {});
    await waitForTx(issueTx.id, { apiBase });
    this.wxAssetId = issueTx.id;

    const wxAmount = 1e16;
    const massTransferTxWx = massTransfer({
      transfers: userNames.map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
      chainId,
    }, this.accounts.voting);
    await api.transactions.broadcast(massTransferTxWx, {});
    await waitForTx(massTransferTxWx.id, { apiBase });
    spinner.succeed('Initialized');
  },
};
