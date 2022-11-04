import { address, random } from '@waves/ts-lib-crypto';
import { massTransfer, nodeInteraction } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const baseSeed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const nonceLength = 3;
const ridePath = 'ride';
const testPath = 'test';
const votingEmissionPath = format({ dir: ridePath, base: 'voting_emission.ride' });
const boostingMockPath = format({ dir: testPath, base: 'boosting.mock.ride' });
const factoryMockPath = format({ dir: testPath, base: 'factory_v2.mock.ride' });
const stakingMockPath = format({ dir: testPath, base: 'staking.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    this.votingDuration = 3;
    // setup accounts
    const contractNames = ['votingEmission', 'votingEmissionCandidate', 'boosting', 'staking', 'factory', 'assetsStore'];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
    this.accounts = Object.fromEntries(names.map((item) => {
      const seed = `${item}#${nonce}`;
      return [item, { seed, addr: address(seed, chainId) }];
    }));
    const amount = 1e10;
    const massTransferTx = massTransfer({
      transfers: Object.values(this.accounts)
        .map(({ addr: recipient }) => ({ recipient, amount })),
      chainId,
    }, baseSeed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });
    // set scripts
    await setScriptFromFile(votingEmissionPath, this.accounts.votingEmission.seed);
    await setScriptFromFile(boostingMockPath, this.accounts.boosting.seed);
    await setScriptFromFile(factoryMockPath, this.accounts.factory.seed);
    await setScriptFromFile(stakingMockPath, this.accounts.staking.seed);
  },
};
