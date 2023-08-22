import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  transfer,
} from '@waves/waves-transactions';

import {
  broadcastAndWait, chainId, waitNBlocks, api,
} from '../../utils/api.mjs';
import { boosting, parseLockParams, keyLock } from './contract/boosting.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('boosting: unlock.mjs', /** @this {MochaSuiteModified} */() => {
  const lockDuration = 3;
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
      dApp: this.accounts.boosting.addr,
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

  it('should successfully unlock', async function () {
    const { height: currentHeight } = await api.blocks.fetchHeight();
    let heightDiff = currentHeight - lockHeight;
    if (heightDiff === 0) {
      await waitNBlocks(1);
      heightDiff += 1;
    }
    const { stateChanges, height: unlockHeight } = await boosting.unlock({
      dApp: this.accounts.boosting.addr,
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

    const t = Math.floor((unlockHeight - lockHeight) / this.blocksInPeriod);
    const exponent = (t * 8 * this.blocksInPeriod) / lockDuration;
    // if height > lockEnd then userAmount
    const wxWithdrawable = Math.floor(lockWxAmount * (1 - 0.5 ** exponent));
    const gwxAmountStart = Math.floor((lockWxAmount * lockDuration) / this.maxLockDuration);
    const gwxAmountPrev = lockParamsPrev.gwxAmount;
    const gwxBurned = Math.min(
      Math.floor(
        (t * this.blocksInPeriod * gwxAmountStart) / this.maxLockDuration,
      ),
      gwxAmountPrev,
    );

    expect(lockParams.wxClaimed).to.equal(wxWithdrawable, 'wxClaimed');
    expect(lockParams.gwxAmount).to.equal(gwxAmountPrev - gwxBurned, 'gwxAmount');
  });
});
