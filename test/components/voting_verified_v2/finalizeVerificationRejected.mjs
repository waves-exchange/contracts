import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';

import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';

import { broadcastAndWait, waitNBlocks } from '../../utils/api.mjs';
import { boostingMock } from './contract/boostingMock.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_verified_v2: finalizeVerificationRejected.mjs', /** @this {MochaSuiteModified} */ () => {
  before(async function () {
    const inFavor = false;

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
      { assetId: this.wxAssetId, amount: this.votingRewardAmount },
    ];

    const { height: votingStartHeight } = await votingVerifiedV2.suggestAdd({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      periodLength: this.votingPeriodLength,
      assetImage: this.assetImage,
      payments,
    });

    this.votingStartHeight = votingStartHeight;
    this.votingEndHeight = votingStartHeight + this.votingPeriodLength;

    await boostingMock.setUserGWXData(
      this.accounts.boosting.seed,
      this.accounts.user0.addr,
      this.gwxAmount,
    );

    await votingVerifiedV2.vote({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      inFavor,
    });

    await waitNBlocks(this.votingPeriodLength, this.waitNBlocksTimeout);
  });

  it('should successfully finalize', async function () {
    const expectedIndex = 0;
    const expectedIsRewardExist = true;
    const expectedRewardAssetId = this.wxAssetId;
    const expectedRewardAmount = this.votingRewardAmount;
    const expectedType = 'verification';
    const expectedStatus = 'rejected';

    const { stateChanges } = await votingVerifiedV2.finalize({
      caller: this.accounts.pacemaker.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%d__votingInfo__${this.wxAssetId}__${expectedIndex}`,
        type: 'string',
        value: `%s%s%d%s%s%d%d%d%d%d__${expectedIsRewardExist}__${expectedRewardAssetId}__${expectedRewardAmount}__${expectedType}__${expectedStatus}__${this.votingStartHeight}__${this.votingEndHeight}__${this.votingThresholdAdd}__0__${this.gwxAmount}`,
      },
    ]);

    expect(stateChanges.transfers).to.eql([
      {
        address: this.accounts.pacemaker.addr,
        asset: this.wxAssetId,
        amount: this.finalizeCallRewardAmount,
      },
      {
        address: this.accounts.user0.addr,
        asset: this.wxAssetId,
        amount: this.votingRewardAmount,
      },
    ]);
  });
});
