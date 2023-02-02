import {
  address, privateKey, publicKey, random,
} from '@waves/ts-lib-crypto';
import {
  massTransfer, issue,
} from '@waves/waves-transactions';
import { table, getBorderCharacters } from 'table';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { api, broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
import { staking } from './contract/staking.mjs';
import { boosting } from './contract/boosting.mjs';
import { emission } from './contract/emission.mjs';
import { factory } from './contract/factory_v2.mjs';
import { gwx } from './contract/gwx.mjs';

const { CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env;
const nonceLength = 3;

const ridePath = '../ride';
const mockPath = './components/staking_boosting/mock';
const stakingPath = format({ dir: ridePath, base: 'staking.ride' });
const boostingPath = format({ dir: ridePath, base: 'boosting.ride' });
const gwxPath = format({ dir: ridePath, base: 'gwx_reward.ride' });
const emissionPath = format({ dir: ridePath, base: 'emission.ride' });
const referralMockPath = format({ dir: mockPath, base: 'referral.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    // setup accounts
    const contractNames = [
      'staking',
      'boosting',
      'emission',
      'gwx',
      'lp',
      'factory',
      'votingEmission',
      'referral',
    ];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
    this.accounts = Object.fromEntries(names.map((item) => {
      const seed = `${item}#${nonce}`;
      return [item, { seed, addr: address(seed, chainId), publicKey: publicKey(seed) }];
    }));
    const amount = 1e10;
    const massTransferTx = massTransfer({
      transfers: Object.values(this.accounts)
        .map(({ addr: recipient }) => ({ recipient, amount })),
      chainId,
    }, baseSeed);
    await broadcastAndWait(massTransferTx);

    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 1e10 * 1e8,
      decimals: 8,
      chainId,
    }, this.accounts.emission.seed);
    await broadcastAndWait(wxIssueTx);
    this.wxAssetId = wxIssueTx.id;

    const lpAssetIssueTx = issue({
      name: 'WXWAVESLP',
      description: '',
      quantity: 1e10 * 1e8,
      decimals: 8,
      chainId,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetIssueTx);
    this.lpAssetId = lpAssetIssueTx.id;

    await setScriptFromFile(stakingPath, this.accounts.staking.seed);
    await setScriptFromFile(boostingPath, this.accounts.boosting.seed);
    await setScriptFromFile(gwxPath, this.accounts.gwx.seed);
    await setScriptFromFile(emissionPath, this.accounts.emission.seed);
    await setScriptFromFile(referralMockPath, this.accounts.referral.seed);

    await staking.init({
      caller: this.accounts.staking.seed,
      factoryAddress: this.accounts.factory.addr,
      votingEmissionAddress: this.accounts.votingEmission.addr,
    });

    this.maxLockDuration = 1440;
    await boosting.init({
      caller: this.accounts.boosting.seed,
      factoryAddress: this.accounts.factory.addr,
      referralsAddress: this.accounts.referral.addr,
      lockAssetId: this.wxAssetId,
      maxLockDuration: this.maxLockDuration,
      mathContract: this.accounts.gwx.addr,
    });

    const { height } = await api.blocks.fetchHeight();
    this.releaseRate = 3805175038;
    this.releaseRateMax = 19025875190;
    this.emissionStartBlock = height;
    this.emissionDuration = 1440;
    await emission.init({
      caller: this.accounts.emission.seed,
      factoryAddress: this.accounts.factory.addr,
      ratePerBlockMax: this.releaseRateMax,
      ratePerBlock: this.releaseRate,
      emissionStartBlock: this.emissionStartBlock,
      emissionDuration: this.emissionDuration,
      wxAssetId: this.wxAssetId,
    });
    await waitForHeight(height + 1);

    await factory.init({
      caller: this.accounts.factory.seed,
      stakingAddress: this.accounts.staking.addr,
      boostingAddress: this.accounts.boosting.addr,
      emissionAddress: this.accounts.emission.addr,
      gwxAddress: this.accounts.gwx.addr,
    });

    await gwx.init({
      caller: this.accounts.gwx.seed,
      referralAddress: this.accounts.referral.addr,
    });

    const accountsInfo = Object.entries(this.accounts)
      .map(([name, { seed, addr }]) => [name, seed, privateKey(seed), addr]);
    console.log(table(accountsInfo, {
      border: getBorderCharacters('norc'),
      drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
      header: { content: `pid = ${process.pid}, nonce = ${nonce}` },
    }));
  },
};
