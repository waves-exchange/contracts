import { transfer, reissue } from '@waves/waves-transactions';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { api, broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';
import { staking } from './contract/staking.mjs';
import { votingEmission } from './contract/votingEmission.mjs';
import { calcGwxAmountAtHeight, calcGwxAmountStart } from './math/gwx.mjs';
import { calcReward } from './math/staking.mjs';
import { calcRewardSimple } from './math/staking_new_boosting.mjs';

const { CHAIN_ID: chainId } = process.env;

chai.use(chaiAsPromised);

describe(`${process.pid}: claim wx`, () => {
  const lpAssetAmount = 1e3 * 1e8;
  const wxAmount = 1e3 * 1e8;
  let lockStartHeight;
  before(async function () {
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: wxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    const lpAssetIssueTx = reissue({
      assetId: this.lpAssetId,
      quantity: lpAssetAmount * 10,
      reissuable: true,
      chainId,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetIssueTx);

    const lpAssetTransferTx = transfer({
      recipient: this.accounts.user0.addr,
      amount: lpAssetAmount,
      assetId: this.lpAssetId,
      additionalFee: 4e5,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetTransferTx);

    ({ height: lockStartHeight } = await boosting.lock({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.user0.seed,
      duration: this.maxLockDuration,
      payments: [{ assetId: this.wxAssetId, amount: wxAmount }],
    }));
    await waitForHeight(lockStartHeight + 1);
  });
  it('should successfully claim', async function () {
    // TODO: fix boosting math
    const { height: stakeHeight } = await staking.stake({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      payments: [{ assetId: this.lpAssetId, amount: lpAssetAmount }],
    });
    await waitForHeight(stakeHeight + 1);

    // total cached gwx = sum of gwx start quantities
    // there's only one user
    const totalCachedGwx = calcGwxAmountStart({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
    });
    const totalCachedGwxEval = (await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      'getTotalCachedGwxREADONLY()',
    )).result.value._2.value;

    expect(BigInt(totalCachedGwxEval)).to.equal(totalCachedGwx);

    const stakedByUser = (await api.utils.fetchEvaluate(
      this.accounts.staking.addr,
      `stakedByUserREADONLY("${this.lpAssetId}", "${this.accounts.user0.addr}")`,
    )).result.value._2.value;

    const stakedTotal = (await api.utils.fetchEvaluate(
      this.accounts.staking.addr,
      `stakedTotalREADONLY("${this.lpAssetId}")`,
    )).result.value._2.value;

    const poolWeight = (await api.utils.fetchEvaluate(
      this.accounts.factory.addr,
      `getPoolWeightREADONLY("${this.lpAssetId}")`,
    )).result.value._2.value;

    const gwxAmount = 1000;
    const { height: votingEmissionHeight } = await votingEmission.vote({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId: this.wxAssetId,
      priceAssetId: this.wavesAssetId,
      amount: gwxAmount,
    });

    await waitForHeight(votingEmissionHeight + 5);

    const { height: finalizeHeight } = await votingEmission.finalize({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.votingEmission.seed,
    });

    await waitForHeight(finalizeHeight + 5);

    let txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });
    const claim1Height = txInfo.height;

    let userGwx = calcGwxAmountAtHeight({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
      lockStartHeight,
      height: txInfo.height,
    });

    const userGwxEval = (await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      `getUserGwxAmountAtHeightREADONLY("${this.accounts.user0.addr}", ${txInfo.height})`,
    )).result.value._2.value;

    expect(BigInt(userGwxEval)).to.equal(userGwx);

    const boostCoeff = (await api.utils.fetchEvaluate(
      this.accounts.emission.addr,
      'getBoostCoeffREADONLY()',
    )).result.value._2.value;

    const { height: currentHeight } = await api.blocks.fetchHeight();
    console.log(finalizeHeight);
    console.log(currentHeight);
    let dh = currentHeight - finalizeHeight;

    let calculatedRewards = calcRewardSimple({
      releaseRate: this.releaseRate,
      dh,
      stakedTotal,
      stakedByUser,
      poolWeight,
      boostCoeff,
    });

    let [
      { amount: reward },
      { amount: boostedReward },
    ] = txInfo.stateChanges.invokes[0].stateChanges.transfers;

    expect(BigInt(reward)).to.equal(calculatedRewards.reward);
    expect(BigInt(boostedReward), 'invalid boosting').to.equal(calculatedRewards.boostedReward);

    // boost = 0 if called in next block?
    await waitForHeight(txInfo.height + 2);
    txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });

    dh = txInfo.height - claim1Height;

    userGwx = calcGwxAmountAtHeight({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
      lockStartHeight,
      height: txInfo.height,
    });

    const dhBoost = txInfo.height - claim1Height;
    calculatedRewards = calcReward({
      releaseRate: this.releaseRate,
      dh,
      dhBoost,
      totalStaked: lpAssetAmount,
      stakedByUser: lpAssetAmount,
      poolWeight: 1e8,
      userGwx,
      totalGwx: totalCachedGwx,
      height: txInfo.height,
      emissionStart: this.emissionStartBlock,
    });

    [
      { amount: reward },
      { amount: boostedReward },
    ] = txInfo.stateChanges.invokes[0].stateChanges.transfers;

    // expect(BigInt(reward)).to.equal(calculatedRewards.reward);
    expect(BigInt(boostedReward)).to.equal(calculatedRewards.boostedReward);
  });
});
