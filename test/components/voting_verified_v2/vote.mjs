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

    await votingVerifiedV2.suggestAdd({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      periodLength: this.votingPeriodLength,
      assetImage: 'base64:assetImage',
      payments,
    });

    await boostingMock.setUserGWXData(
      this.accounts.boosting.seed,
      this.accounts.user0.addr,
      this.gwxAmount,
    );
  });

  it('should successfully vote', async function () {
    const currentIndex = 0;
    const inFavor = true;

    const { stateChanges } = await votingVerifiedV2.vote({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      inFavor,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%d%s__vote__${this.wxAssetId}__${currentIndex}__${this.accounts.user0.addr}`,
        type: 'string',
        value: `%s%d__${inFavor}__${this.gwxAmount}`,
      },
      {
        key: `%s%s%d__votingResult__${this.wxAssetId}__${currentIndex}`,
        type: 'string',
        value: `%d%d__${this.gwxAmount}__0`,
      },
      {
        key: `%s%s%s%d__votingReward__${this.accounts.user0.addr}__${this.wxAssetId}__${currentIndex}`,
        type: 'boolean',
        value: true,
      },
    ]);
  });
});
