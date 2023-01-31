import { data, transfer } from '@waves/waves-transactions';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
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

    const { height } = await staking.stake({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      payments: [{ assetId: this.lpAssetId, amount: lpAssetAmount }],
    });
    await waitForHeight(height + 1);

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
  });
  it('should successfully claim', async function () {
    let txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });
    const claim1Height = txInfo.height;

    let dh = claim1Height - this.emissionStartBlock - 1;
    let calculatedRewards = calcReward({
      releaseRate: this.releaseRate,
      dh,
      totalStaked: lpAssetAmount,
      stakedByUser: lpAssetAmount,
      poolWeight: 1,
    });

    let [
      { amount: reward },
      { amount: boostedReward },
    ] = txInfo.stateChanges.invokes[0].stateChanges.transfers;

    expect(reward).to.equal(calculatedRewards.reward);
    // there's not boost in the first claim
    expect(boostedReward).to.equal(0);

    await waitForHeight(txInfo.height + 1);
    txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });

    dh = txInfo.height - claim1Height;

    const userGwx = calcGwxAmountAtHeight({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
      lockStartHeight,
      height: txInfo.height,
    });

    // total cached gwx = sum of gwx start quantities
    // there's only one user
    const totalCachedGwx = calcGwxAmountStart({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
    });

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
