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
          amount: this.votingRewardAmount,
          assetId: this.wxAssetId,
          additionalFee: 4e5,
        },
        this.accounts.emission.seed,
      ),
    );
  });

  it('should successfully suggestAdd', async function () {
    const currentIndex = 0;

    const { height, stateChanges } = await votingVerifiedV2.suggestAdd({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      periodLength: this.votingPeriodLength,
      assetImage: 'base64:assetImage',
      wxAssetId: this.wxAssetId,
      assetAmount: this.votingRewardAmount,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s__currentIndex__${this.wxAssetId}`,
        type: 'integer',
        value: currentIndex,
      },
      {
        key: `%s%s%s__verification__inProgress__${this.wxAssetId}`,
        type: 'boolean',
        value: true,
      },
      {
        key: `%s%s%s__votingRewardAssetId__${this.wxAssetId}__${currentIndex}`,
        type: 'string',
        value: this.wxAssetId,
      },
      {
        key: `%s%s%s__votingReward__${this.wxAssetId}__${currentIndex}`,
        type: 'integer',
        value: this.votingRewardAmount,
      },
      {
        key: `%s%s%s__currentVotingHeightStart__${this.wxAssetId}__${currentIndex}`,
        type: 'integer',
        value: height,
      },
      {
        key: `%s%s%s__periodLengthAdd__${this.wxAssetId}__${currentIndex}`,
        type: 'integer',
        value: this.votingPeriodLength,
      },
      {
        key: `%s%s%s__suggestIssuer__${this.wxAssetId}__${currentIndex}`,
        type: 'string',
        value: this.accounts.user0.addr,
      },
      {
        key: `%s%s%s__votingEndHeight__${this.wxAssetId}__${currentIndex}`,
        type: 'integer',
        value: height + this.votingPeriodLength,
      },
    ]);
  });
});
