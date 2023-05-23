import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_verified_v2: suggestAdd.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully suggestAdd', async function () {
    const res = await votingVerifiedV2.suggestAdd({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      periodLength: 10,
      assetImage: 'base64:assetImage',
      wxAssetId: this.wxAssetId,
      assetAmount: 1e8,
    });

    await expect(res).to.be.fulfilled;
  });
});
