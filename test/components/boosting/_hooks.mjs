import {
  address, privateKey, publicKey, random,
} from '@waves/ts-lib-crypto';
import {
  massTransfer,
  issue,
} from '@waves/waves-transactions';
import { table, getBorderCharacters } from 'table';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import {
  api, broadcastAndWait, waitForHeight, chainId, baseSeed,
} from '../../utils/api.mjs';
import { staking } from './contract/staking.mjs';
import { boosting } from './contract/boosting.mjs';
import { emission } from './contract/emission.mjs';
import { factory } from './contract/factory.mjs';
import { assetsStore } from './contract/assetsStore.mjs';
import { gwx } from './contract/gwx.mjs';
import { votingEmission } from './contract/votingEmission.mjs';
import { managerVault } from './contract/managerVault.mjs';

const nonceLength = 3;

const ridePath = '../ride';
const mockPath = './components/staking_boosting/mock';
const stakingPath = format({ dir: ridePath, base: 'staking.ride' });
const boostingPath = format({ dir: ridePath, base: 'boosting.ride' });
const gwxPath = format({ dir: ridePath, base: 'gwx_reward.ride' });
const emissionPath = format({ dir: ridePath, base: 'emission.ride' });
const referralMockPath = format({ dir: mockPath, base: 'referral.mock.ride' });
const votingEmissionPath = format({ dir: ridePath, base: 'voting_emission.ride' });
const factoryPath = format({ dir: ridePath, base: 'factory_v2.ride' });
const assetsStorePath = format({ dir: ridePath, base: 'assets_store.ride' });
const lpPath = format({ dir: ridePath, base: 'lp.ride' });
const votingEmissionCandidate = format({ dir: ridePath, base: 'voting_emission_candidate.ride' });
const referralPath = format({ dir: ridePath, base: 'referral.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    // setup accounts
    const contractNames = [
      'staking',
      'store',
      'feeCollector',
      'boosting',
      'emission',
      'gwx',
      'lp',
      'factory',
      'votingEmission',
      'referral',
      'votingEmissionCandidate',
      'manager',
      'managerVault',
      'referral',
      'referrer',
      'lpStakingPools',
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

    this.wavesAssetId = 'WAVES';

    await Promise.all([
      setScriptFromFile(stakingPath, this.accounts.staking.seed),
      setScriptFromFile(boostingPath, this.accounts.boosting.seed),
      setScriptFromFile(gwxPath, this.accounts.gwx.seed),
      setScriptFromFile(emissionPath, this.accounts.emission.seed),
      setScriptFromFile(referralMockPath, this.accounts.referral.seed),
      setScriptFromFile(votingEmissionPath, this.accounts.votingEmission.seed),
      setScriptFromFile(factoryPath, this.accounts.factory.seed),
      setScriptFromFile(assetsStorePath, this.accounts.store.seed),
      setScriptFromFile(lpPath, this.accounts.lp.seed),
      setScriptFromFile(votingEmissionCandidate, this.accounts.votingEmissionCandidate.seed),
      setScriptFromFile(referralPath, this.accounts.referral.seed),
    ]);

    this.minLockAmount = 500000000;
    this.minDuration = 2;
    this.maxDuration = 2102400;

    this.maxLockDuration = 2102400;
    this.blocksInPeriod = 1;
    this.lockStepBlocks = 1;

    const { height } = await api.blocks.fetchHeight();
    this.releaseRate = 3805175038;
    this.releaseRateMax = 19025875190;
    this.emissionStartBlock = 1806750;
    this.emissionEndBlock = 4434750;
    this.emissionDuration = this.emissionEndBlock - this.emissionStartBlock;

    this.epochLength = 7;

    await Promise.all([
      managerVault.init({
        caller: this.accounts.managerVault.seed,
        managerPublicKey: this.accounts.manager.publicKey,
      }),

      staking.init({
        caller: this.accounts.staking.seed,
        factoryAddress: this.accounts.factory.addr,
        votingEmissionAddress: this.accounts.votingEmission.addr,
      }),

      boosting.init({
        caller: this.accounts.boosting.seed,
        factoryAddress: this.accounts.factory.addr,
        referralsAddress: this.accounts.referral.addr,
        votingEmissionAddress: this.accounts.votingEmission.addr,
        lpStakingPoolsAddress: this.accounts.lpStakingPools.addr,
        managerVaultAddress: this.accounts.managerVault.addr,
        lockAssetId: this.wxAssetId,
        minLockAmount: this.minLockAmount,
        minLockDuration: this.minDuration,
        maxLockDuration: this.maxLockDuration,
        mathContract: this.accounts.gwx.addr,
        blocksInPeriod: this.blocksInPeriod,
        lockStepBlocks: this.lockStepBlocks,
      }),

      emission.init({
        caller: this.accounts.emission.seed,
        factoryAddress: this.accounts.factory.addr,
        ratePerBlockMax: this.releaseRateMax,
        ratePerBlock: this.releaseRate,
        emissionStartBlock: this.emissionStartBlock,
        emissionDuration: this.emissionDuration,
        wxAssetId: this.wxAssetId,
        boostingV2StartHeight: height,
      }),

      factory.init({
        caller: this.accounts.factory.seed,
        stakingAddress: this.accounts.staking.addr,
        boostingAddress: this.accounts.boosting.addr,
        emissionAddress: this.accounts.emission.addr,
        gwxAddress: this.accounts.gwx.addr,
        votingEmissionAddress: this.accounts.votingEmission.addr,
      }),

      gwx.init({
        caller: this.accounts.gwx.seed,
        referralAddress: this.accounts.referral.addr,
        wxAssetId: this.wxAssetId,
        matcherPacemakerAddress: '',
        boostingContractAddress: this.accounts.boosting.addr,
        gwxRewardEmissionPartStartHeight: 1,
        emissionContractAddress: this.accounts.emission.addr,
      }),

      assetsStore.init({
        caller: this.accounts.store.seed,
        factorySeed: this.accounts.factory.seed,
        labels: 'COMMUNITY_VERIFIED__GATEWAY__STABLECOIN__STAKING_LP__3RD_PARTY__ALGO_LP__LAMBO_LP__POOLS_LP__WX__PEPE',
      }),

      votingEmission.init({
        dApp: this.accounts.votingEmission.addr,
        caller: this.accounts.votingEmission.seed,
        factoryAddress: this.accounts.factory.addr,
        votingEmissionCandidateAddress: this.accounts.votingEmissionCandidate.addr,
        boostingAddress: this.accounts.boosting.addr,
        stakingAddress: this.accounts.staking.addr,
        epochLength: this.epochLength,
      }),

      factory.setWxEmissionPoolLabel({
        dApp: this.accounts.factory.addr,
        caller: this.accounts.factory.seed,
        amountAssetId: this.wxAssetId,
        priceAssetId: this.wavesAssetId,
      }),

      votingEmission.create({
        dApp: this.accounts.votingEmission.addr,
        caller: this.accounts.votingEmission.seed,
        amountAssetId: this.wxAssetId,
        priceAssetId: this.wavesAssetId,
      }),

      votingEmission.updateEpochUiKey({
        caller: this.accounts.votingEmission.seed,
        epochUiKey: height + 10,
        epochStartHeight: height,
      }),
    ]);

    ({ lpAssetId: this.lpAssetId } = await factory.createPool({
      amountAssetId: this.wxAssetId,
      priceAssetId: this.wavesAssetId,
      accountsStore: this.accounts.store.seed,
      accountsFactoryV2: this.accounts.factory.seed,
      accountsLp: this.accounts.lp.seed,
      accountsFeeCollector: this.accounts.feeCollector.seed,
    }));

    await factory.addPoolWeight({
      accountsLp: this.accounts.lp.seed,
      accountsFactoryV2: this.accounts.factory.seed,
      poolWeight: 1000,
    });

    await waitForHeight(height + 1);

    const accountsInfo = Object.entries(this.accounts)
      .map(([name, { seed, addr }]) => [name, seed, privateKey(seed), addr]);
    console.log(table(accountsInfo, {
      border: getBorderCharacters('norc'),
      drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
      header: { content: `pid = ${process.pid}, nonce = ${nonce}` },
    }));
  },
};
