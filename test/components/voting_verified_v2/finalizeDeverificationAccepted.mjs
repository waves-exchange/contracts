import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';

import { votingVerifiedV2 } from './contract/votingVerifiedV2.mjs';

import { broadcastAndWait, waitNBlocks } from '../../utils/api.mjs';
import { boostingMock } from './contract/boostingMock.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_verified_v2: finalizeDeverificationAccepted.mjs', /** @this {MochaSuiteModified} */ () => {
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

    let payments = [
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

    await boostingMock.setUserGWXData(
      this.accounts.boosting.seed,
      this.accounts.user0.addr,
      this.minSuggestRemoveBalance,
    );

    payments = [
      { assetId: this.wxAssetId, amount: this.wxForSuggestRemoveAmountRequired },
    ];

    const { height: votingStartHeight } = await votingVerifiedV2.suggestRemove({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      payments,
    });

    this.votingStartHeight = votingStartHeight;
    this.votingEndHeight = votingStartHeight + this.votingPeriodLength;

    await votingVerifiedV2.vote({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      inFavor,
    });

    await waitNBlocks(this.votingPeriodLength, this.waitNBlocksTimeout);
  });

  it('should successfully finalize', async function () {
    const expectedIndex = 1;
    const expectedIsRewardExist = false;
    const expectedRewardAssetId = 'EMPTY';
    const expectedRewardAmount = 0;
    const expectedType = 'deverification';
    const expectedStatus = 'accepted';

    const { stateChanges } = await votingVerifiedV2.finalize({
      caller: this.accounts.pacemaker.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%d__votingInfo__${this.wxAssetId}__${expectedIndex}`,
        type: 'string',
        value: `%s%s%d%s%s%d%d%d%d%d__${expectedIsRewardExist}__${expectedRewardAssetId}__${expectedRewardAmount}__${expectedType}__${expectedStatus}__${this.votingStartHeight}__${this.votingEndHeight}__${this.votingThresholdRemove}__${this.minSuggestRemoveBalance}__0`,
      },
    ]);
    expect(stateChanges.invokes[1].dApp).to.equal(this.accounts.store.addr);
    expect(stateChanges.invokes[1].call).to.deep.equal({
      function: 'onEliminate',
      args: [
        {
          type: 'String',
          value: this.wxAssetId,
        },
      ],
    });
  });
});
