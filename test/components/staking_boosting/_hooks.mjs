import {
  address, privateKey, publicKey, random,
} from '@waves/ts-lib-crypto';
import {
  massTransfer, issue,
} from '@waves/waves-transactions';
import { table, getBorderCharacters } from 'table';
import { format } from 'path';
import { BigNumber } from '@waves/bignumber';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { broadcastAndWait } from '../../utils/api.mjs';
import { staking } from './contract/staking.mjs';
import { boosting } from './contract/boosting.mjs';
import { emission } from './contract/emission.mjs';

const { CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env;
const nonceLength = 3;

const ridePath = '../ride';
// const mockPath = './components/lp_staking_pools/mock';
const stakingPath = format({ dir: ridePath, base: 'staking.ride' });
const boostingPath = format({ dir: ridePath, base: 'boosting.ride' });
const gwxPath = format({ dir: ridePath, base: 'gwx_reward.ride' });
const emissionPath = format({ dir: ridePath, base: 'emission.ride' });
// const factoryMockPath = format({ dir: mockPath, base: 'factory_v2.ride' });

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
      'referrals',
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
      quantity: new BigNumber(1e18 * 1e8),
      decimals: 8,
      chainId,
    }, baseSeed);
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

    await staking.init({
      caller: this.accounts.staking.seed,
      factoryAddress: this.accounts.factory.addr,
      votingEmissionAddress: this.accounts.votingEmission.addr,
    });

    await boosting.init({
      caller: this.accounts.boosting.seed,
      factoryAddress: this.accounts.factory.addr,
      referralsAddress: this.accounts.referrals.addr,
      lockAssetId: this.wxAssetId,
      maxLockDuration: 1440,
      mathContract: this.accounts.gwx.addr,
    });

    await emission.init({
      caller: this.accounts.emission.seed,
      factoryAddress: this.accounts.factory.addr,
      ratePerBlockMax: 19025875190,
      ratePerBlock: 3805175038,
      emissionStartBlock: 0,
      emissionDuration: 1440,
      wxAssetId: this.wxAssetId,
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
