import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { reissue, transfer } from '@waves/waves-transactions';
import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';
import { broadcastAndWait, chainId } from '../../utils/api.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: get`, () => {
  let shareAssetId;
  const shareAssetAmount = 10 * 1e8;
  before(async function () {
    await factoryMock.setPoolAndAsset({
      poolAddress: this.accounts.lpStable.addr,
      lpAssetId: this.lpAssetId,
      caller: this.accounts.factory.seed,
    });

    const { stateChanges } = await lpStakingPools.create({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.lpStakingPools.seed,
      baseAssetId: this.usdtAssetId,
      shareAssetName: 'usdt share asset',
    });

    shareAssetId = stateChanges.issues[0].assetId;

    const reissuable = true;
    await broadcastAndWait(reissue({
      assetId: shareAssetId,
      quantity: shareAssetAmount,
      reissuable,
      chainId,
    }, this.accounts.lpStakingPools.seed));

    await broadcastAndWait(transfer({
      recipient: this.accounts.user.addr,
      assetId: shareAssetId,
      amount: shareAssetAmount,
      chainId,
    }, this.accounts.lpStakingPools.seed));
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
