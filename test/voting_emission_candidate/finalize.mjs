import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { sleep } from '../utils.mjs';
import {
  setPoolsStatusActiveData,
  setStoreStatusData,
  suggest,
  setUserGWXData,
  vote,
  finalize,
  setThreshold,
} from './utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_emission_candidate: finalize.mjs', /** @this {MochaSuiteModified} */ () => {
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

    await vote(
      this.accounts.votingEmissionCandidate,
      this.accounts.user0,
      this.amountAssetId,
      this.usdnId,
      true,
    );

    const threshold = 1;
    await setThreshold(
      this.accounts.votingEmissionCandidate,
      this.accounts.votingEmissionCandidate,
      threshold,
      4e5,
    );
  });

  it('successfull finalize voting', async function () {
    // TODO: wait for height
    await sleep(20);
    const { stateChanges } = await finalize(
      this.accounts.votingEmissionCandidate,
      this.accounts.user0,
      this.amountAssetId,
      this.usdnId,
    );

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%s__inList__${this.amountAssetId}__${this.usdnId}`,
        value: null,
      },
    ]);
  });
});
