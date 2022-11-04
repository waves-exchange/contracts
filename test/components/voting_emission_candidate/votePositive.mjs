import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';

import {
  setPoolsStatusActiveData,
  setStoreStatusData,
  suggest,
  setUserGWXData,
  vote,
} from './utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const chainId = 'R';

describe('voting_emission_candidate: vote.mjs', /** @this {MochaSuiteModified} */ () => {
  before(async function () {
    await setPoolsStatusActiveData(
      this.accounts.pools,
      this.amountAssetId,
      this.usdnId,
    );
    await setStoreStatusData(this.accounts.store, this.amountAssetId);

    await suggest(
      this.accounts.votingEmissionCandidate,
      this.accounts.user0,
      this.amountAssetId,
      this.usdnId,
      this.wxAssetId,
    );

    await setUserGWXData(this.accounts.boosting, this.accounts.user0, this.gwxAmount);
  });

  it('successfull positive vote', async function () {
    const suggestIndex = 0;
    const callerAddress = address(this.accounts.user0, chainId);

    const { stateChanges } = await vote(
      this.accounts.votingEmissionCandidate,
      this.accounts.user0,
      this.amountAssetId,
      this.usdnId,
      true,
    );

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%s%d__votingResult__${this.amountAssetId}__${this.usdnId}__${suggestIndex}`,
        type: 'string',
        value: `%d%d__${this.gwxAmount}__0`,
      },
      {
        key: `%s%s%s%d%s__vote__${this.amountAssetId}__${this.usdnId}__${suggestIndex}__${callerAddress}`,
        type: 'string',
        value: `%d%s__${this.gwxAmount}__yes`,
      },
    ]);
  });
});
