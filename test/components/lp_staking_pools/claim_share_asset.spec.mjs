import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { transfer } from '@waves/waves-transactions';
import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';
import { broadcastAndWait, chainId, baseSeed } from '../../utils/api.mjs';
import { lpStableMock } from './contract/lp_stable.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: claimShareAsset`, () => {
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

    await lpStakingPools.create({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.lpStakingPools.seed,
      baseAssetId,
      shareAssetName: 'usdt share asset',
    });

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

    const unstakeAndGetOneTknV2Result = 10e6;
    await lpStableMock.setUnstakeAndGetOneTknV2Result({
      caller: this.accounts.lpStable.seed,
      value: unstakeAndGetOneTknV2Result,
    });

    await lpStakingPools.finalize({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.pacemaker.seed,
      baseAssetId,
    });
  });
  it('should successfully claim share asset after put and finalization', async function () {
    const baseAssetId = this.usdtAssetId;
    const txInfo = await lpStakingPools.claimShareAsset({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      baseAssetId,
    });
    expect(txInfo.applicationStatus).to.equal('succeeded');
  });
});
