import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  massTransfer,
} from '@waves/waves-transactions';

import {
  broadcastAndWait, chainId, waitForHeight,
} from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';
import { GwxReward, gwx } from './contract/gwx.mjs';

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
        {
          recipient: this.accounts.user2.addr,
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

  it('should successfully claim reward (simple)', async function () {
    await waitForHeight(lockHeight + 1);
    const { stateChanges, height: claimHeight } = await gwx.claimReward({
      dApp: this.accounts.gwx.addr,
      caller: this.accounts.user0.seed,
    });
    const transferToUser = stateChanges.transfers[0];
    const userGwxAmount = boosting.calcGwxAmountStart({
      wxAmount: lockWxAmount,
      duration: lockDuration,
    });
    const totalGwxAmount = 2 * userGwxAmount;
    const expectedAmount = GwxReward.calcReward({
      releaseRateList: [this.releaseRate],
      gwxHoldersRewardList: [this.gwxHoldersReward],
      dhList: [claimHeight - lockHeight],
      userGwxAmountList: [userGwxAmount],
      totalGwxAmountList: [totalGwxAmount],
    });

    expect(transferToUser.amount).to.equal(expectedAmount);
  });

  it('should successfully claim reward (2 parts)', async function () {
    const { height: user2LockHeight } = await boosting.lock({
      caller: this.accounts.user2.seed,
      duration: lockDuration,
      payments: [
        { assetId: this.wxAssetId, amount: lockWxAmount },
      ],
      chainId,
    });
    await waitForHeight(user2LockHeight + 1);
    const { stateChanges, height: claimHeight } = await gwx.claimReward({
      dApp: this.accounts.gwx.addr,
      caller: this.accounts.user1.seed,
    });
    const transferToUser = stateChanges.transfers[0];
    const userGwxAmount = boosting.calcGwxAmountStart({
      wxAmount: lockWxAmount,
      duration: lockDuration,
    });
    const expectedAmount = GwxReward.calcReward({
      releaseRateList: [this.releaseRate, this.releaseRate],
      gwxHoldersRewardList: [this.gwxHoldersReward, this.gwxHoldersReward],
      dhList: [user2LockHeight - lockHeight, claimHeight - user2LockHeight],
      userGwxAmountList: [userGwxAmount, userGwxAmount],
      totalGwxAmountList: [2 * userGwxAmount, 3 * userGwxAmount],
    });

    expect(transferToUser.amount).to.equal(expectedAmount);
  });
});
