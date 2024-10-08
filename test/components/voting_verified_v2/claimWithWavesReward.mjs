import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';

import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';

import { broadcastAndWait, waitNBlocks } from '../../utils/api.mjs';
import { boostingMock } from './contract/boostingMock.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_verified_v2: claim.mjs', /** @this {MochaSuiteModified} */ () => {
  before(async function () {
    const inFavor = true;

    await broadcastAndWait(
      transfer(
        {
          recipient: this.accounts.user0.addr,
          amount: this.wxMinForSuggestAddAmountRequired + this.votingRewardAmount,
          assetId: this.wxAssetId,
          additionalFee: 4e5,
        },
        this.accounts.emission.seed,
      ),
    );

    const payments = [
      { assetId: this.wxAssetId, amount: this.wxMinForSuggestAddAmountRequired },
      { assetId: null, amount: this.votingRewardAmount },
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
  });

  it('should successfully claim and receive Waves', async function () {
    await waitNBlocks(this.votingPeriodLength, this.waitNBlocksTimeout);

    await votingVerifiedV2.finalize({
      caller: this.accounts.pacemaker.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
    });

    const currentIndex = 0;

    const { stateChanges } = await votingVerifiedV2.claim({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      index: currentIndex,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%s%d__history__${this.accounts.user0.addr}__${this.wxAssetId}__${currentIndex}`,
        type: 'integer',
        value: this.votingRewardAmount,
      },
      {
        key: `%s%s%s%d__votingReward__${this.accounts.user0.addr}__${this.wxAssetId}__${currentIndex}`,
        value: null,
      },
    ]);

    expect(stateChanges.transfers).to.eql([
      {
        address: this.accounts.user0.addr,
        asset: null,
        amount: this.votingRewardAmount,
      },
    ]);
  });
});
