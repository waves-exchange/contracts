import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';

import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';

import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_verified_v2: suggestAdd.mjs', /** @this {MochaSuiteModified} */ () => {
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
    await broadcastAndWait(
      transfer(
        {
          recipient: this.accounts.user0.addr,
          amount: 123456,
          assetId: this.usdtAssetId,
          additionalFee: 4e5,
        },
        this.accounts.emission.seed,
      ),
    );
  });

  it('should successfully suggestAdd with non Waves reward', async function () {
    const expectedIndex = 0;
    const expectedIsRewardExist = true;
    const expectedRewardAssetId = this.usdtAssetId;
    const expectedRewardAmount = 123456;
    const expectedType = 'verification';
    const expectedStatus = 'inProgress';

    const payments = [
      { assetId: this.wxAssetId, amount: this.wxMinForSuggestAddAmountRequired },
      { assetId: this.usdtAssetId, amount: expectedRewardAmount },
    ];

    const { height, stateChanges } = await votingVerifiedV2.suggestAdd({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      periodLength: this.votingPeriodLength,
      assetImage: this.assetImage,
      payments,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s__currentIndex__${this.wxAssetId}`,
        type: 'integer',
        value: expectedIndex,
      },
      {
        key: `%s%s%d__suggestIssuer__${this.wxAssetId}__${expectedIndex}`,
        type: 'string',
        value: this.accounts.user0.addr,
      },
      {
        key: `%s%s%d__votingInfo__${this.wxAssetId}__${expectedIndex}`,
        type: 'string',
        value: `%s%s%d%s%s%d%d%d%d%d__${expectedIsRewardExist}__${expectedRewardAssetId}__${expectedRewardAmount}__${expectedType}__${expectedStatus}__${height}__${height + this.votingPeriodLength}__${this.votingThresholdAdd}__0__0`,
      },
      {
        key: `%s%s__assetImage__${this.wxAssetId}`,
        type: 'string',
        value: this.assetImage,
      },
      {
        key: `%s%s%d__votingRewardAssetId__${this.wxAssetId}__0`,
        type: 'string',
        value: expectedRewardAssetId,
      },
      {
        key: `%s%s%d__totalVotingReward__${this.wxAssetId}__0`,
        type: 'integer',
        value: expectedRewardAmount,
      },
    ]);
  });
});
