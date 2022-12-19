import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
// import { api } from '../../utils/api.mjs';

import {
  lpStakingPools,
} from './contract/lp_staking_pools.mjs';

chai.use(chaiAsPromised);

describe(`${process.pid}: lp_staking_pools: create`, () => {
  it('successfull create', async function () {
    const { addr: dApp, seed: caller } = this.accounts.lpStakingPools;
    const baseAssetId = this.usdtAssetId;
    const shareAssetId = '';
    const shareAssetName = 'usdt share asset';
    const shareAssetDescription = '';
    const shareAssetLogo = '';
    chai.expect(lpStakingPools.create({
      dApp,
      caller,
      baseAssetId,
      shareAssetId,
      shareAssetName,
      shareAssetDescription,
      shareAssetLogo,
    })).to.be.rejectedWith('invalid base asset');
  });
});
