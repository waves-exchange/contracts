import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';

import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';

import { broadcastAndWait } from '../../utils/api.mjs';
import { boostingMock } from './contract/boostingMock.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_verified_v2: vote.mjs', /** @this {MochaSuiteModified} */ () => {
  before(async function () {
    await broadcastAndWait(
      transfer(
        {
          recipient: this.accounts.user0.addr,
          amount: this.votingRewardAmount + this.wxMinForSuggestAddAmountRequired,
          assetId: this.wxAssetId,
          additionalFee: 4e5,
        },
        this.accounts.emission.seed,
      ),
    );

    const payments = [
      { assetId: this.wxAssetId, amount: this.wxMinForSuggestAddAmountRequired },
    ];

    const { height: votingStartHeight } = await votingVerifiedV2.suggestAdd({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      periodLength: this.votingPeriodLength,
      assetImage: 'base64:assetImage',
      payments,
    });

    this.votingStartHeight = votingStartHeight;
    this.votingEndHeight = votingStartHeight + this.votingPeriodLength;

    await boostingMock.setUserGWXData(
      this.accounts.boosting.seed,
      this.accounts.user0.addr,
      this.gwxAmount,
    );
  });

  it('should successfully vote', async function () {
    const inFavor = true;
    const expectedIndex = 0;
    const expectedIsRewardExist = false;
    const expectedRewardAssetId = 'EMPTY';
    const expectedRewardAmount = 0;
    const expectedType = 'verification';
    const expectedStatus = 'inProgress';

    const { stateChanges } = await votingVerifiedV2.vote({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      inFavor,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%d%s__vote__${this.wxAssetId}__${expectedIndex}__${this.accounts.user0.addr}`,
        type: 'string',
        value: `%s%d__${inFavor}__${this.gwxAmount}`,
      },
      {
        key: `%s%s%d__votingInfo__${this.wxAssetId}__${expectedIndex}`,
        type: 'string',
        value: `%s%s%d%s%s%d%d%d%d%d__${expectedIsRewardExist}__${expectedRewardAssetId}__${expectedRewardAmount}__${expectedType}__${expectedStatus}__${this.votingStartHeight}__${this.votingEndHeight}__${this.votingThresholdAdd}__${this.gwxAmount}__0`,
      },
    ]);
  });
});
