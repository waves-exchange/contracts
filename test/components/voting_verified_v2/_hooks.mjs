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

const { CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env;
const nonceLength = 3;

const ridePath = '../ride';
const votingVerifiedV2Path = format({ dir: ridePath, base: 'voting_verified_v2.ride' });
const boostingPath = format({ dir: ridePath, base: 'boosting.ride' });
const emissionPath = format({ dir: ridePath, base: 'emission.ride' });
const assetsStorePath = format({ dir: ridePath, base: 'assets_store.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    // setup accounts
    const contractNames = [
      'votingVerifiedV2',
      'boosting',
      'emission',
      'store',
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

    await setScriptFromFile(votingVerifiedV2Path, this.accounts.votingVerifiedV2.seed);
    await setScriptFromFile(boostingPath, this.accounts.boosting.seed);
    await setScriptFromFile(emissionPath, this.accounts.emission.seed);
    await setScriptFromFile(assetsStorePath, this.accounts.store.seed);

    this.maxLockDuration = 1440;
    await boosting.init({
      caller: this.accounts.boosting.seed,
      factoryAddress: this.accounts.factory.addr,
      referralsAddress: this.accounts.referral.addr,
      lockAssetId: this.wxAssetId,
      maxLockDuration: this.maxLockDuration,
      mathContract: this.accounts.gwx.addr,
      votingEmissionAddress: this.accounts.votingEmission.addr,
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
      boostingV2StartHeight: height,
    });
    await waitForHeight(height + 1);

    await assetsStore.init({
      caller: this.accounts.store.seed,
      factorySeed: this.accounts.factory.seed,
      labels: 'COMMUNITY_VERIFIED__GATEWAY__STABLECOIN__STAKING_LP__3RD_PARTY__ALGO_LP__LAMBO_LP__POOLS_LP__WX__PEPE',
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
