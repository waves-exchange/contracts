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
          amount: this.votingRewardAmount,
          assetId: this.wxAssetId,
          additionalFee: 4e5,
        },
        this.accounts.emission.seed,
      ),
    );

    await votingVerifiedV2.suggestAdd({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      periodLength: this.votingPeriodLength,
      assetImage: 'base64:assetImage',
      wxAssetId: this.wxAssetId,
      assetAmount: this.votingRewardAmount,
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
    await boostingMock.setUserGWXData(
      this.accounts.boosting.seed,
      this.accounts.user0.addr,
      this.minSuggestRemoveBalance,
    );

    const { height, stateChanges } = await votingVerifiedV2.suggestRemove({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s__currentIndex__${this.wxAssetId}`,
        type: 'integer',
        value: 1,
      },
      {
        key: `%s%s%s__deverification__inProgress__${this.wxAssetId}`,
        type: 'boolean',
        value: true,
      },
      {
        key: `%s%s%s__currentVotingHeightStart__${this.wxAssetId}__1`,
        type: 'integer',
        value: height,
      },
      {
        key: `%s%s%s__suggestIssuer__${this.wxAssetId}__1`,
        type: 'string',
        value: this.accounts.user0.addr,
      },
      {
        key: `%s%s%s__votingEndHeight__${this.wxAssetId}__1`,
        type: 'integer',
        value: height + this.periodLengthRemove,
      },
    ]);
  });
});
