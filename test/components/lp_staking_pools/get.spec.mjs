import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { transfer } from '@waves/waves-transactions';
import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';
import { broadcastAndWait, chainId, baseSeed } from '../../utils/api.mjs';
import { lpStableMock } from './contract/lp_stable.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: get`, () => {
  let shareAssetId;
  let shareAssetAmount;
  before(async function () {
    const baseAssetId = this.usdtAssetId;
    await factoryMock.setPoolAndAsset({
      poolAddress: this.accounts.lpStable.addr,
      lpAssetId: this.lpAssetId,
      caller: this.accounts.factory.seed,
    });

    const { stateChanges: createStateChanges } = await lpStakingPools.create({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.lpStakingPools.seed,
      baseAssetId,
      shareAssetName: 'usdt share asset',
    });

    shareAssetId = createStateChanges.issues[0].assetId;

    const baseAssetAmount = 100 * 1e6;
    await broadcastAndWait(transfer({
      recipient: this.accounts.user.addr,
      assetId: this.usdtAssetId,
      amount: baseAssetAmount,
      chainId,
    }, baseSeed));

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

    const { stateChanges: claimShareAssetStateChanges } = await lpStakingPools.claimShareAsset({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      baseAssetId,
    });
    shareAssetAmount = claimShareAssetStateChanges.transfers[0].amount;
  });
  it('should successfully get', async function () {
    const txInfo = await lpStakingPools.get({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      shareAssetId,
      shareAssetAmount,
    });
    expect(txInfo.applicationStatus).to.equal('succeeded');
  });
});
