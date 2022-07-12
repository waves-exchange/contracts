import { address, randomSeed } from '@waves/ts-lib-crypto';
import {
  invokeScript,
  issue,
  massTransfer,
  nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../utils.mjs';

const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
const testPath = 'test';

const assetsStoreMockPath = format({
  dir: testPath,
  base: 'assets_store.mock.ride',
});
const boostingMockPath = format({ dir: testPath, base: 'boosting.mock.ride' });
const factoryMockPath = format({ dir: testPath, base: 'factory_v2.mock.ride' });
const emissionMockPath = format({ dir: testPath, base: 'emission.mock.ride' });
const poolsMockPath = format({ dir: testPath, base: 'user_pools.mock.ride' });
const votingEmissionMockPath = format({ dir: testPath, base: 'voting_emission.mock.ride' });
const votingEmissionCandidatePath = format({
  dir: ridePath,
  base: 'voting_emission_candidate.ride',
});

export const mochaHooks = {
  async beforeAll() {
    const contractNames = [
      'boosting',
      'emission',
      'factory',
      'pools',
      'store',
      'votingEmissionCandidate',
      'votingEmission',
    ];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'manager'];
    this.accounts = Object.fromEntries(
      names.map((item) => [item, randomSeed(seedWordsCount)]),
    );
    const seeds = Object.values(this.accounts);
    const amount = 1e10;

    const massTransferTx = massTransfer(
      {
        transfers: seeds.map((item) => ({
          recipient: address(item, chainId),
          amount,
        })),
        chainId,
      },
      seed,
    );
    await api.transactions.broadcast(massTransferTx, {});
    await ni.waitForTx(massTransferTx.id, { apiBase });

    await setScriptFromFile(assetsStoreMockPath, this.accounts.store);
    await setScriptFromFile(boostingMockPath, this.accounts.boosting);
    await setScriptFromFile(emissionMockPath, this.accounts.emission);
    await setScriptFromFile(factoryMockPath, this.accounts.factory);
    await setScriptFromFile(poolsMockPath, this.accounts.pools);
    await setScriptFromFile(votingEmissionMockPath, this.accounts.votingEmission);
    await setScriptFromFile(
      votingEmissionCandidatePath,
      this.accounts.votingEmissionCandidate,
    );

    this.feeAmount = 100000000;
    this.votingDuration = 2;
    this.finalizeReward = 1;
    this.gwxAmount = 100;

    const wxAssetTx = issue(
      {
        name: 'WX Token',
        description: '',
        quantity: 10e17,
        decimals: 8,
        chainId,
      },
      this.accounts.manager,
    );
    await api.transactions.broadcast(wxAssetTx, {});
    await ni.waitForTx(wxAssetTx.id, { apiBase });
    this.wxAssetId = wxAssetTx.id;

    const wxMassTransferTx = massTransfer(
      {
        transfers: seeds.map((item) => ({
          recipient: address(item, chainId),
          amount,
        })),
        chainId,
        assetId: this.wxAssetId,
      },
      this.accounts.manager,
    );
    await api.transactions.broadcast(wxMassTransferTx, {});
    await ni.waitForTx(wxMassTransferTx.id, { apiBase });

    const usdnAssetTx = issue(
      {
        name: 'USDN',
        description: '',
        quantity: 10e16,
        decimals: 8,
        chainId,
      },
      this.accounts.manager,
    );
    await api.transactions.broadcast(usdnAssetTx, {});
    await ni.waitForTx(usdnAssetTx.id, { apiBase });
    this.usdnId = usdnAssetTx.id;

    const amountAssetTx = issue(
      {
        name: 'Amount Asset',
        description: '',
        quantity: 10e16,
        decimals: 8,
        chainId,
      },
      this.accounts.user0,
    );
    await api.transactions.broadcast(amountAssetTx, {});
    await ni.waitForTx(amountAssetTx.id, { apiBase });
    this.amountAssetId = amountAssetTx.id;

    const wxAmount = 1e16;

    const massTransferTxWx = massTransfer(
      {
        transfers: names.map((name) => ({
          recipient: address(this.accounts[name], chainId),
          amount: wxAmount,
        })),
        assetId: this.wxAssetId,
        chainId,
      },
      this.accounts.manager,
    );
    await api.transactions.broadcast(massTransferTxWx, {});
    await ni.waitForTx(massTransferTxWx.id, { apiBase });

    const invokeTx = invokeScript(
      {
        dApp: address(this.accounts.votingEmissionCandidate, chainId),
        additionalFee: 4e5,
        call: {
          function: 'constructor',
          args: [
            { type: 'string', value: address(this.accounts.store, chainId) },
            { type: 'string', value: address(this.accounts.boosting, chainId) },
            { type: 'string', value: address(this.accounts.emission, chainId) },
            { type: 'string', value: address(this.accounts.factory, chainId) },
            { type: 'string', value: address(this.accounts.pools, chainId) },
            { type: 'string', value: address(this.accounts.votingEmission, chainId) },
            { type: 'integer', value: this.feeAmount },
            { type: 'string', value: this.wxAssetId },
            { type: 'integer', value: this.votingDuration },
            { type: 'string', value: this.usdnId },
            { type: 'integer', value: this.finalizeReward },
          ],
        },
        chainId,
      },
      this.accounts.votingEmissionCandidate,
    );
    await api.transactions.broadcast(invokeTx, {});
    await ni.waitForTx(invokeTx.id, { apiBase });
  },
};
