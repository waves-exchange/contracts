import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';

import { waitNBlocks } from '@waves/waves-transactions/dist/nodeInteraction.js';
import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';

import { broadcastAndWait } from '../../utils/api.mjs';
import { boostingMock } from './contract/boostingMock.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_verified_v2: suggestRemove.mjs', /** @this {MochaSuiteModified} */ () => {
  before(async function () {
    const inFavor = true;

    await broadcastAndWait(
      transfer(
        {
          recipient: this.accounts.user0.addr,
          amount: this.votingRewardAmount
            + this.wxMinForSuggestAddAmountRequired
            + this.wxForSuggestRemoveAmountRequired,
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
      assetImage: this.assetImage,
      payments,
    });

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

    await votingVerifiedV2.finalize({
      caller: this.accounts.pacemaker.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
    });
  });

  it('should successfully suggestRemove', async function () {
    const expectedIndex = 1;
    const expectedIsRewardExist = false;
    const expectedRewardAssetId = 'EMPTY';
    const expectedRewardAmount = 0;
    const expectedType = 'deverification';
    const expectedStatus = 'inProgress';

    await boostingMock.setUserGWXData(
      this.accounts.boosting.seed,
      this.accounts.user0.addr,
      this.minSuggestRemoveBalance,
    );

    const payments = [
      { assetId: this.wxAssetId, amount: this.wxForSuggestRemoveAmountRequired },
    ];

    const { height, stateChanges } = await votingVerifiedV2.suggestRemove({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
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
        value: `%s%s%d%s%s%d%d%d%d%d__${expectedIsRewardExist}__${expectedRewardAssetId}__${expectedRewardAmount}__${expectedType}__${expectedStatus}__${height}__${height + this.votingPeriodLength}__${this.votingThresholdRemove}__0__0`,
      },
    ]);
  });
});
