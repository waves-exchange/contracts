import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
// import { api } from '../../utils/api.mjs';

import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';

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
