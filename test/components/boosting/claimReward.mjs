import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  massTransfer,
} from '@waves/waves-transactions';

import {
  broadcastAndWait, chainId, waitForHeight,
} from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';
import { gwx } from './contract/gwx.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('boosting: claimReward.mjs', /** @this {MochaSuiteModified} */() => {
  const lockDuration = 3;
  const lockWxAmount = 1e3 * 1e8;
  let lockHeight;

  before(async function () {
    await broadcastAndWait(massTransfer({
      transfers: [
        {
          recipient: this.accounts.user0.addr,
          amount: lockWxAmount,
        },
        {
          recipient: this.accounts.user1.addr,
          amount: lockWxAmount,
        },
      ],
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    ([{ height: lockHeight }] = await Promise.all([
      boosting.lock({
        caller: this.accounts.user0.seed,
        duration: lockDuration,
        payments: [
          { assetId: this.wxAssetId, amount: lockWxAmount },
        ],
        chainId,
      }),
      boosting.lock({
        caller: this.accounts.user1.seed,
        duration: lockDuration,
        payments: [
          { assetId: this.wxAssetId, amount: lockWxAmount },
        ],
        chainId,
      }),
    ]));
  });

  it('should successfully claim reward', async function () {
    await waitForHeight(lockHeight + 1);
    const { stateChanges, height: claimHeight } = await gwx.claimReward({
      dApp: this.accounts.gwx.addr,
      caller: this.accounts.user0.seed,
    });
    const transferToUser = stateChanges.transfers[0];
    const expectedAmount = Math.floor((
      this.releaseRate * this.gwxHoldersReward * (claimHeight - lockHeight)
    ) / (2 * 1e8));

    expect(transferToUser.amount).to.equal(expectedAmount);
  });
});
