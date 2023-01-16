import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';
import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';
import { broadcastAndWait, chainId, baseSeed } from '../../utils/api.mjs';
import { lpStableMock } from './contract/lp_stable.mjs';
import { stakingMock } from './contract/staking.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: finalize`, () => {
  before(async function () {
    await factoryMock.setPoolAndAsset({
      poolAddress: this.accounts.lpStable.addr,
      lpAssetId: this.lpAssetId,
      caller: this.accounts.factory.seed,
    });

    await lpStakingPools.create({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.lpStakingPools.seed,
      baseAssetId: this.usdtAssetId,
      shareAssetName: 'usdt share asset',
    });

    await broadcastAndWait(transfer({
      recipient: this.accounts.user.addr,
      assetId: this.usdtAssetId,
      amount: 100 * 1e6,
      chainId,
    }, baseSeed));

    const baseAssetAmount = 100 * 1e6;
    await lpStakingPools.put({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      baseAssetId: this.usdtAssetId,
      baseAssetAmount,
    });

    const putOneTkn2Result = 1e8;
    await lpStableMock.setPutOneTknV2Result({
      caller: this.accounts.lpStable.seed,
      value: putOneTkn2Result,
    });

    const stakedByUserResult = 1e8;
    await stakingMock.setStakedByUser({
      caller: this.accounts.staking.seed,
      value: stakedByUserResult,
    });
  });
  it('should successfully finalize', async function () {
    const txInfo = await lpStakingPools.finalize({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.pacemaker.seed,
      baseAssetId: this.usdtAssetId,
    });
    expect(txInfo.applicationStatus).to.equal('succeeded');
  });
});
