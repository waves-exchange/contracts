import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer } from '@waves/waves-transactions';

import { broadcastAndWait } from '../../utils/api.mjs';
import {
  boosting, parseLockParams, keyLock, keyUserGwxAmountTotal,
} from './contract/boosting.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('boosting: lock.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully lock', async function () {
    const lockDuration = 3;

    const lockWxAmount = 1e3 * 1e8;

    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: lockWxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    const { stateChanges, id: lockTxId } = await boosting.lock({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.user0.seed,
      duration: lockDuration,
      payments: [
        { assetId: this.wxAssetId, amount: lockWxAmount },
      ],
    });

    const boostingDataChanges = Object.fromEntries(
      stateChanges.data.map(({ key, value }) => [key, value]),
    );

    const lockKey = keyLock(this.accounts.user0.addr, lockTxId);
    const lockParams = parseLockParams(
      boostingDataChanges[lockKey],
    );

    const expectedGwxAmount = Math.floor((lockWxAmount * lockDuration) / this.maxLockDuration);
    expect(lockParams.wxAmount).to.equal(lockWxAmount);
    expect(lockParams.gwxAmount).to.equal(expectedGwxAmount);
    expect(
      boostingDataChanges[keyUserGwxAmountTotal(this.accounts.user0.addr)],
    ).to.equal(expectedGwxAmount);
  });
});
