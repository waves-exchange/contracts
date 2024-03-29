import { data, transfer } from '@waves/waves-transactions';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { api, broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';
import { staking } from './contract/staking.mjs';
import { calcGwxAmountAtHeight, calcGwxAmountStart } from './math/gwx.mjs';
import { calcReward } from './math/staking.mjs';

const { CHAIN_ID: chainId } = process.env;

chai.use(chaiAsPromised);

const separator = '__';

describe(`${process.pid}: claim wx`, () => {
  const lpAssetAmount = 1e3 * 1e8;
  const wxAmount = 1e3 * 1e8;
  let lockStartHeight;
  before(async function () {
    await broadcastAndWait(data({
      data: [
        {
          key: ['%s%s%s', this.lpAssetId, 'mappings', 'lpAsset2PoolContract'].join(separator),
          type: 'string',
          value: this.accounts.lp.addr,
        },
        {
          key: ['%s%s', 'poolWeight', this.accounts.lp.addr].join(separator),
          type: 'integer',
          value: 1e8,
        },
      ],
      chainId,
    }, this.accounts.factory.seed));

    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: lpAssetAmount,
      assetId: this.lpAssetId,
      additionalFee: 4e5,
    }, this.accounts.factory.seed));

    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: wxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    ({ height: lockStartHeight } = await boosting.lock({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.user0.seed,
      duration: this.maxLockDuration,
      payments: [{ assetId: this.wxAssetId, amount: wxAmount }],
    }));
    // await waitForHeight(lockStartHeight + 1);

    const { height } = await staking.stake({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      payments: [{ assetId: this.lpAssetId, amount: lpAssetAmount }],
    });
    await waitForHeight(height + 1);

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

    let dh = claim1Height - height;
    let dhBoost = claim1Height - lockStartHeight;
    let calculatedRewards = calcReward({
      releaseRate: this.releaseRate,
      dh,
      dhBoost,
      totalStaked: lpAssetAmount,
      stakedByUser: lpAssetAmount,
      poolWeight: 1e8,
      userGwx,
      totalGwx: totalCachedGwx,
      height: claim1Height,
      emissionStart: this.emissionStartBlock,
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

    dhBoost = txInfo.height - claim1Height;
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

    expect(BigInt(reward)).to.equal(calculatedRewards.reward);
    expect(BigInt(boostedReward)).to.equal(calculatedRewards.boostedReward);
  });
  it('should successfully claim', async function () {
    const currentEmissionEndBlock = await api.addresses.fetchDataKey(
      this.accounts.emission.addr,
      ['%s%s', 'emission', 'endBlock'].join(separator),
    );

    const newEmissionEndBlock = currentEmissionEndBlock.value * 2;
    console.log(newEmissionEndBlock);
    const emissionEndBlockKey = ['%s%s', 'emission', 'endBlock'].join(separator);
    await broadcastAndWait(data({
      data: [
        {
          key: emissionEndBlockKey,
          type: 'integer',
          value: newEmissionEndBlock,
        },
      ],
      chainId,
    }, this.accounts.boosting.seed));

    const currentHeight = await api.blocks.fetchHeight();

    calculatedRewards = calcReward({
      releaseRate: this.releaseRate,
      dh,
      totalStaked: lpAssetAmount,
      stakedByUser: lpAssetAmount,
      poolWeight: 1,
      userGwx,
      totalGwx: totalCachedGwx,
    });

    [
      { amount: reward },
      { amount: boostedReward },
    ] = txInfo.stateChanges.invokes[0].stateChanges.transfers;

    expect(reward).to.equal(calculatedRewards.reward);
    expect(boostedReward).to.equal(calculatedRewards.boostedReward);
  });
});
