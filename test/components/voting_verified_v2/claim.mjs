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

  it('should successfully claim', async function () {
    const currentIndex = 0;

    const { stateChanges } = await votingVerifiedV2.claim({
      caller: this.accounts.user0.seed,
      dApp: this.accounts.votingVerifiedV2.addr,
      assetId: this.wxAssetId,
      index: currentIndex,
    });

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%s%s__history__${this.accounts.user0.addr}__${this.wxAssetId}__${currentIndex}`,
        type: 'string',
        value: `%d%s__${this.votingRewardAmount}`,
      },
    ]);

    expect(stateChanges.transfers).to.eql([
      {
        address: this.accounts.user0.addr,
        asset: this.wxAssetId,
        amount: this.votingRewardAmount,
      },
    ]);
  });
});
