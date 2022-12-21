import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { transfer } from '@waves/waves-transactions';
import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';
import { broadcastAndWait, chainId, baseSeed } from '../../utils/api.mjs';
import { lpStableMock } from './contract/lp_stable.mjs';
import { stakingMock } from './contract/staking.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: claimBaseAsset`, () => {
  let shareAssetId;
  before(async function () {
    const baseAssetId = this.usdtAssetId;
    await factoryMock.setPoolAndAsset({
      poolAddress: this.accounts.lpStable.addr,
      lpAssetId: this.lpAssetId,
      caller: this.accounts.factory.seed,
    });

    await broadcastAndWait(transfer({
      recipient: this.accounts.user.addr,
      assetId: baseAssetId,
      amount: 100 * 1e6,
      chainId,
    }, baseSeed));

    const { stateChanges } = await lpStakingPools.create({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.lpStakingPools.seed,
      baseAssetId,
      shareAssetName: 'usdt share asset',
    });

    shareAssetId = stateChanges.issues[0].assetId;

    const baseAssetAmount = 100 * 1e6;
    await lpStakingPools.put({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      baseAssetId,
      baseAssetAmount,
    });

    const putOneTkn2Result = 1e8;
    await lpStableMock.setPutOneTknV2Result({
      caller: this.accounts.lpStable.seed,
      value: putOneTkn2Result,
    });

    await lpStakingPools.finalize({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.pacemaker.seed,
      baseAssetId,
    });

    await lpStakingPools.claimShareAsset({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      baseAssetId,
    });

    const shareAssetAmount = 1e8;
    await lpStakingPools.get({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      shareAssetId,
      shareAssetAmount,
    });

    const unstakeAndGetOneTknV2Result = 10e6;
    await lpStableMock.setUnstakeAndGetOneTknV2Result({
      caller: this.accounts.lpStable.seed,
      value: unstakeAndGetOneTknV2Result,
    });

    const stakedByUser = 1e8;
    await stakingMock.setStakedByUser({
      caller: this.accounts.staking.seed,
      value: stakedByUser,
    });

    await lpStakingPools.finalize({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.pacemaker.seed,
      baseAssetId,
    });
  });
  it('should successfully claim base asset after get', async function () {
    const baseAssetId = this.usdtAssetId;
    const txInfo = await lpStakingPools.claimBaseAsset({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      baseAssetId,
    });
    expect(txInfo.applicationStatus).to.equal('succeeded');
  });
});
