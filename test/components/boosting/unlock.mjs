import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  transfer,
} from '@waves/waves-transactions';

import {
  broadcastAndWait, chainId, waitForHeight, api,
} from '../../utils/api.mjs';
import { boosting, parseLockParams, keyLock } from './contract/boosting.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('boosting: unlock.mjs', /** @this {MochaSuiteModified} */() => {
  const lockDuration = 4;
  const lockWxAmount = 1e3 * 1e8;
  let lockTxId;
  let lockHeight;
  let lockParamsPrev;

  before(async function () {
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: lockWxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    let stateChanges;
    ({ id: lockTxId, height: lockHeight, stateChanges } = await boosting.lock({
      caller: this.accounts.user0.seed,
      duration: lockDuration,
      payments: [
        { assetId: this.wxAssetId, amount: lockWxAmount },
      ],
      chainId,
    }));

    const boostingDataChanges = Object.fromEntries(
      stateChanges.data.map(({ key, value }) => [key, value]),
    );

    const lockKey = keyLock(this.accounts.user0.addr, lockTxId);
    lockParamsPrev = parseLockParams(
      boostingDataChanges[lockKey],
    );
  });

  it('nothing to unlock', async function () {
    const { height: currentHeight } = await api.blocks.fetchHeight();

    expect(currentHeight - lockHeight).to.equal(0);

    return expect(boosting.unlock({
      caller: this.accounts.user0.seed,
      txId: lockTxId,
    })).to.be.rejectedWith('nothing to unlock');
  });

  it('should successfully unlock', async function () {
    const { height: currentHeight } = await api.blocks.fetchHeight();
    let heightDiff = currentHeight - lockHeight;
    if (heightDiff === 0) {
      await waitForHeight(currentHeight + 1);
      heightDiff += 1;
    }
    const { stateChanges, height: unlockHeight } = await boosting.unlock({
      caller: this.accounts.user0.seed,
      txId: lockTxId,
    });
    const boostingDataChanges = Object.fromEntries(
      stateChanges.data.map(({ key, value }) => [key, value]),
    );

    const lockKey = keyLock(this.accounts.user0.addr, lockTxId);
    const lockParams = parseLockParams(
      boostingDataChanges[lockKey],
    );

    const passedPeriods = Math.floor((unlockHeight - lockHeight) / this.blocksInPeriod);
    const wxWithdrawable = boosting.calcWxWithdrawable({
      lockWxAmount,
      lockDuration,
      passedPeriods,
    });
    const gwxAmountStart = boosting.calcGwxAmountStart({
      wxAmount: lockWxAmount,
      duration: lockDuration,
    });
    const gwxAmountPrev = lockParamsPrev.gwxAmount;
    const gwxBurned = boosting.calcGwxAmountBurned({
      gwxAmountStart, gwxAmountPrev, passedPeriods,
    });

    expect(lockParams.wxClaimed).to.equal(wxWithdrawable, 'wxClaimed');
    expect(lockParams.gwxAmount).to.equal(gwxAmountPrev - gwxBurned, 'gwxAmount');
  });
});
