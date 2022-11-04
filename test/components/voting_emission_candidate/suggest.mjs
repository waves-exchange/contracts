import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  setPoolsStatusActiveData,
  setStoreStatusData,
  suggest,
} from './utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_emission_candidate: suggest.mjs', /** @this {MochaSuiteModified} */ () => {
  it('ok then user pools is active', async function () {
    await setPoolsStatusActiveData(
      this.accounts.pools,
      this.amountAssetId,
      this.usdnId,
    );
    await setStoreStatusData(this.accounts.store, this.amountAssetId);

    const { stateChanges, height } = await suggest(
      this.accounts.votingEmissionCandidate,
      this.accounts.user0,
      this.amountAssetId,
      this.usdnId,
      this.wxAssetId,
    );

    const suggetIndex = 0;

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%s__inList__${this.amountAssetId}__${this.usdnId}`,
        type: 'integer',
        value: suggetIndex,
      },
      {
        key: `%s%s%s%d__startHeight__${this.amountAssetId}__${this.usdnId}__${suggetIndex}`,
        type: 'integer',
        value: height,
      },
      {
        key: `%s%s%s%d__votingResult__${this.amountAssetId}__${this.usdnId}__${suggetIndex}`,
        type: 'string',
        value: '%d%d__0__0',
      },
      {
        key: `%s%s%s__suggestIndex__${this.amountAssetId}__${this.usdnId}`,
        type: 'integer',
        value: suggetIndex,
      },
    ]);
  });
});
