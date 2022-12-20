import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
// import { api } from '../../utils/api.mjs';

import { lpStakingPools } from './contract/lp_staking_pools.mjs';
import { factoryMock } from './contract/factory_v2.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: create`, () => {
  before(async function () {
    await factoryMock.setPoolAndAsset({
      poolAddress: this.accounts.lpStable.addr,
      lpAssetId: this.lpAssetId,
      caller: this.accounts.factory.seed,
    });
  });
  it('successfull create', async function () {
    const { addr: dApp, seed: caller } = this.accounts.lpStakingPools;
    const baseAssetId = this.usdtAssetId;
    const shareAssetId = '';
    const shareAssetName = 'usdt share asset';
    const shareAssetDescription = '';
    const shareAssetLogo = '';
    const txInfo = await lpStakingPools.create({
      dApp,
      caller,
      baseAssetId,
      shareAssetId,
      shareAssetName,
      shareAssetDescription,
      shareAssetLogo,
    });
    expect(txInfo.applicationStatus).to.equal('succeeded');
  });
});
