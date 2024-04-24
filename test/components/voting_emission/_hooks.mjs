import { address, random } from '@waves/ts-lib-crypto';
import { massTransfer, data, issue } from '@waves/waves-transactions';
import { format, join } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import {
  baseSeed, broadcastAndWait, chainId,
} from '../../utils/api.mjs';

const nonceLength = 3;
const ridePath = '../ride';
const testPath = 'common_mock';
const mocksDir = join('components', 'voting_emission', 'mocks');
const votingEmissionPath = format({ dir: ridePath, base: 'voting_emission.ride' });
const boostingMockPath = format({ dir: testPath, base: 'boosting.mock.ride' });
const factoryMockPath = format({ dir: testPath, base: 'factory_v2.mock.ride' });
const stakingMockPath = format({ dir: testPath, base: 'staking.mock.ride' });
const gwxRewardMockPath = format({ dir: testPath, base: 'gwx_reward.mock.ride' });
const assetsStoreMockPath = format({ dir: testPath, base: 'assets_store.mock.ride' });
const votingEmissionRateMockPath = format({ dir: mocksDir, base: 'voting_emission_rate.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    this.votingDuration = 3;
    // setup accounts
    const contractNames = ['votingEmission', 'votingEmissionCandidate', 'boosting', 'staking', 'factory', 'assetsStore', 'gwxReward', 'votingEmissionRate', 'pool1', 'pool2'];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
    this.accounts = Object.fromEntries(names.map((item) => {
      const seed = `${item}#${nonce}`;
      return [item, { seed, addr: address(seed, chainId) }];
    }));
    const amount = 1e10;
    await broadcastAndWait(massTransfer({
      transfers: Object.values(this.accounts)
        .map(({ addr: recipient }) => ({ recipient, amount })),
      chainId,
    }, baseSeed));

    const [
      { id: wxAssetId },
    ] = await Promise.all([
      broadcastAndWait(issue({
        name: 'WX Token', description: '', quantity: 1e8 * 1e8, decimals: 8, reissuable: true, chainId,
      }, baseSeed)),
    ]);

    this.wxAssetId = wxAssetId;

    // set state
    await Promise.all([
      broadcastAndWait(data({
        data: [
          { key: '%s__factoryConfig', type: 'string', value: ['%s', '1', '2', '3', '4', '5', '6', '7', '8', '9', this.accounts.gwxReward.addr, '11'].join('__') },
          { key: '%s__assetsStoreContract', type: 'string', value: this.accounts.assetsStore.addr },
        ],
        chainId,
      }, this.accounts.factory.seed)),
      broadcastAndWait(data({
        data: [
          { key: '%s__factoryContract', type: 'string', value: this.accounts.factory.addr },
          { key: '%s__boostingContract', type: 'string', value: this.accounts.boosting.addr },
        ],
        chainId,
      }, this.accounts.votingEmission.seed)),
      broadcastAndWait(data({
        data: [
          { key: '%s__config', type: 'string', value: `%s%d%d%d__${wxAssetId}` },
        ],
        chainId,
      }, this.accounts.boosting.seed)),
    ]);

    // set scripts
    await Promise.all([
      setScriptFromFile(votingEmissionPath, this.accounts.votingEmission.seed),
      setScriptFromFile(boostingMockPath, this.accounts.boosting.seed),
      setScriptFromFile(factoryMockPath, this.accounts.factory.seed),
      setScriptFromFile(stakingMockPath, this.accounts.staking.seed),
      setScriptFromFile(gwxRewardMockPath, this.accounts.gwxReward.seed),
      setScriptFromFile(votingEmissionRateMockPath, this.accounts.votingEmissionRate.seed),
      setScriptFromFile(assetsStoreMockPath, this.accounts.assetsStore.seed),
    ]);
  },
};
