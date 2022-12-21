import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { transfer } from '@waves/waves-transactions';
import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';
import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: put`, () => {
  before(async function () {
    await factoryMock.setPoolAndAsset({
      poolAddress: this.accounts.lpStable.addr,
      lpAssetId: this.lpAssetId,
      caller: this.accounts.factory.seed,
    });

    await broadcastAndWait(transfer({
      recipient: this.accounts.user.addr,
      assetId: this.usdtAssetId,
      amount: 100 * 1e6,
    }, this.baseSeed));

    await lpStakingPools.create({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.lpStakingPools.seed,
      baseAssetId: this.usdtAssetId,
      shareAssetName: 'usdt share asset',
    });
  });
  it('successfull put', async function () {
    const baseAssetAmount = 100 * 1e6;
    const txInfo = await lpStakingPools.put({
      dApp: this.accounts.lpStakingPools.addr,
      caller: this.accounts.user.seed,
      baseAssetId: this.usdtAssetId,
      baseAssetAmount,
    });
    expect(txInfo.applicationStatus).to.equal('succeeded');
  });
});
