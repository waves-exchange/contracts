import { address, randomSeed } from '@waves/ts-lib-crypto';
import {
  data,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import ora from 'ora';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { broadcastAndWait } from '../../utils/api.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = '../ride';
const testPath = 'common_mock';
const userPoolsPath = format({ dir: ridePath, base: 'user_pools.ride' });
const assetsStoreMockPath = format({ dir: testPath, base: 'assets_store.mock.ride' });
const emissionMockPath = format({ dir: testPath, base: 'emission.mock.ride' });
const lpMockPath = format({ dir: testPath, base: 'lp.mock.ride' });
const mockPath = join('components', 'user_pools', 'mocks');
const factoryV2MockPath = format({ dir: mockPath, base: 'factory_v2.mock.ride' });
const votingEmissionCandidateMockPath = format({ dir: mockPath, base: 'voting_emission_candidate.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const spinner = ora('Initializing').start();
    // setup accounts
    const names = ['pools', 'store', 'factory', 'emission', 'lp', 'user', 'votingEmission', 'votingEmissionCandidate'];
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
    await setScriptFromFile(votingEmissionCandidateMockPath, this.accounts.votingEmissionCandidate);
    await setScriptFromFile(lpMockPath, this.accounts.lp);
    await setScriptFromFile(emissionMockPath, this.accounts.emission);

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
      additionalFee: 4e5,
      data: [{
        key: '%s__priceAssets',
        type: 'string',
        value: this.usdnAssetId,
      }, {
        key: '%s__poolAssetDefaultMinAmount',
        type: 'integer',
        value: 100,
      }, {
        key: `%s%s__poolAssetMinAmount__${this.usdnAssetId}`,
        type: 'integer',
        value: 1000,
      }],
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(setPriceAssetsTx, {});
    await waitForTx(setPriceAssetsTx.id, { apiBase });

    const setVotingEmissionContractTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__votingEmissionContract',
        type: 'string',
        value: address(this.accounts.votingEmission, chainId),
      }],
      chainId,
    }, this.accounts.factory);
    await broadcastAndWait(setVotingEmissionContractTx);

    const setVotingEmissionCandidateContractTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__votingEmissionCandidateContract',
        type: 'string',
        value: address(this.accounts.votingEmissionCandidate, chainId),
      }],
      chainId,
    }, this.accounts.votingEmission);
    await broadcastAndWait(setVotingEmissionCandidateContractTx);

    const verifyTokenDataTx = data({
      data: [
        { key: `status_<${this.usdnAssetId}>`, type: 'integer', value: 2 },
      ],
      chainId,
    }, this.accounts.store);
    await broadcastAndWait(verifyTokenDataTx);

    spinner.succeed('Initialized');
  },
};
