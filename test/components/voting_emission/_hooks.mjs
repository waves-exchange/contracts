import { address, random } from '@waves/ts-lib-crypto';
import { massTransfer, nodeInteraction, data } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import {
  apiBase, baseSeed, broadcastAndWait, chainId,
} from '../../utils/api.mjs';

const { waitForTx } = nodeInteraction;
const api = create(apiBase);
const nonceLength = 3;
const ridePath = '../ride';
const testPath = 'common_mock';
const votingEmissionPath = format({ dir: ridePath, base: 'voting_emission.ride' });
const boostingMockPath = format({ dir: testPath, base: 'boosting.mock.ride' });
const factoryMockPath = format({ dir: testPath, base: 'factory_v2.mock.ride' });
const stakingMockPath = format({ dir: testPath, base: 'staking.mock.ride' });
const gwxRewardMockPath = format({ dir: testPath, base: 'gwx_reward.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    this.votingDuration = 3;
    // setup accounts
    const contractNames = ['votingEmission', 'votingEmissionCandidate', 'boosting', 'staking', 'factory', 'assetsStore', 'gwxReward'];
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
    // set state
    await broadcastAndWait(data({
      data: [
        { key: '%s__factoryConfig', type: 'string', value: ['%s', '1', '2', '3', '4', '5', '6', '7', '8', '9', this.accounts.gwxReward.addr, '11'].join('__') },
      ],
      chainId,
    }, this.accounts.factory.seed));
    // set scripts
    await setScriptFromFile(votingEmissionPath, this.accounts.votingEmission.seed);
    await setScriptFromFile(boostingMockPath, this.accounts.boosting.seed);
    await setScriptFromFile(factoryMockPath, this.accounts.factory.seed);
    await setScriptFromFile(stakingMockPath, this.accounts.staking.seed);
    await setScriptFromFile(gwxRewardMockPath, this.accounts.gwxReward.seed);
  },
};
