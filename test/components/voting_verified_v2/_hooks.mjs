import {
  address, privateKey, publicKey, random,
} from '@waves/ts-lib-crypto';
import { massTransfer, issue } from '@waves/waves-transactions';
import { table, getBorderCharacters } from 'table';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { api, broadcastAndWait, waitForHeight } from '../../utils/api.mjs';

import { assetsStore } from './contract/assetsStore.mjs';
import { emission } from './contract/emission.mjs';
import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';
import { factoryV2 } from './contract/factoryV2.mjs';

const { CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env;
const nonceLength = 3;

const ridePath = '../ride';
const mockPath = 'common_mock';
const votingVerifiedV2Path = format({
  dir: ridePath,
  base: 'voting_verified_v2.ride',
});
const boostingPath = format({ dir: mockPath, base: 'boosting.mock.ride' });
const emissionPath = format({ dir: ridePath, base: 'emission.ride' });
const assetsStorePath = format({ dir: ridePath, base: 'assets_store.ride' });
const factoryV2Path = format({ dir: mockPath, base: 'factory_v2.mock.ride' });
const referralPath = format({ dir: ridePath, base: 'referral.ride' });
const gwxRewardPath = format({ dir: ridePath, base: 'gwx_reward.ride' });
const votingEmissionPath = format({
  dir: ridePath,
  base: 'voting_emission.ride',
});

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    // setup accounts
    const contractNames = [
      'votingVerifiedV2',
      'boosting',
      'emission',
      'store',
      'factory',
      'referral',
      'gwx',
      'votingEmission',
    ];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
    this.accounts = Object.fromEntries(
      names.map((item) => {
        const seed = `${item}#${nonce}`;
        return [
          item,
          { seed, addr: address(seed, chainId), publicKey: publicKey(seed) },
        ];
      }),
    );
    const amount = 1e10;
    const massTransferTx = massTransfer(
      {
        transfers: Object.values(this.accounts).map(({ addr: recipient }) => ({
          recipient,
          amount,
        })),
        chainId,
      },
      baseSeed,
    );
    await broadcastAndWait(massTransferTx);

    const wxIssueTx = issue(
      {
        name: 'WX Token',
        description: '',
        quantity: 1e10 * 1e8,
        decimals: 8,
        chainId,
      },
      this.accounts.emission.seed,
    );
    await broadcastAndWait(wxIssueTx);
    this.wxAssetId = wxIssueTx.id;

    this.wavesAssetId = 'WAVES';

    await setScriptFromFile(
      votingVerifiedV2Path,
      this.accounts.votingVerifiedV2.seed,
    );
    await setScriptFromFile(boostingPath, this.accounts.boosting.seed);
    await setScriptFromFile(emissionPath, this.accounts.emission.seed);
    await setScriptFromFile(assetsStorePath, this.accounts.store.seed);
    await setScriptFromFile(factoryV2Path, this.accounts.factory.seed);
    await setScriptFromFile(referralPath, this.accounts.referral.seed);
    await setScriptFromFile(gwxRewardPath, this.accounts.gwx.seed);
    await setScriptFromFile(
      votingEmissionPath,
      this.accounts.votingEmission.seed,
    );

    this.waitNBlocksTimeout = 9999999;

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
      boostingV2StartHeight: height,
    });
    await waitForHeight(height + 1);

    await assetsStore.init({
      caller: this.accounts.store.seed,
      factoryAddress: this.accounts.factory.addr,
      factoryPublicKey: this.accounts.factory.publicKey,
      votingVerifiedV2PublicKey: this.accounts.votingVerifiedV2.publicKey,
      labels:
        'COMMUNITY_VERIFIED__GATEWAY__STABLECOIN__STAKING_LP__3RD_PARTY__ALGO_LP__LAMBO_LP__POOLS_LP__WX__PEPE',
    });

    await factoryV2.init({
      caller: this.accounts.factory.seed,
      assetsStoreAddress: this.accounts.store.addr,
    });

    // boostingMock
    this.gwxAmount = 1000;

    this.minPeriodLength = 2;
    this.maxPeriodLength = 100;
    this.votingPeriodLength = 2;

    this.feePerBlock = 10;
    this.votingRewardAmount = this.votingPeriodLength * this.feePerBlock;

    this.votingThresholdAdd = this.gwxAmount;
    this.votingThresholdRemove = this.gwxAmount;
    this.minSuggestRemoveBalance = 1e8;
    this.periodLengthRemove = 2;
    this.wxMinForSuggestAddAmountRequired = 100;
    this.wxForSuggestRemoveAmountRequired = 5;
    this.finalizeCallRewardAmount = 5;

    await votingVerifiedV2.init({
      caller: this.accounts.votingVerifiedV2.seed,
      minPeriodLength: this.minPeriodLength,
      maxPeriodLength: this.maxPeriodLength,
      feePerBlock: this.feePerBlock,
      boostingContract: this.accounts.boosting.addr,
      emissionContract: this.accounts.emission.addr,
      assetsStoreContract: this.accounts.store.addr,
      votingThresholdAdd: this.votingThresholdAdd,
      votingThresholdRemove: this.votingThresholdRemove,
      minSuggestRemoveBalance: this.minSuggestRemoveBalance,
      periodLengthRemove: this.periodLengthRemove,
      wxMinForSuggestAddAmountRequired: this.wxMinForSuggestAddAmountRequired,
      wxForSuggestRemoveAmountRequired: this.wxForSuggestRemoveAmountRequired,
      finalizeCallRewardAmount: this.finalizeCallRewardAmount,
    });

    const accountsInfo = Object.entries(this.accounts).map(
      ([name, { seed, addr }]) => [name, seed, privateKey(seed), addr],
    );
    console.log(
      table(accountsInfo, {
        border: getBorderCharacters('norc'),
        drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
        header: { content: `pid = ${process.pid}, nonce = ${nonce}` },
      }),
    );
  },
};
