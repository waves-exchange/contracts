import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  transfer,
} from '@waves/waves-transactions';

import {
  broadcastAndWait, chainId, waitForHeight,
} from '../../utils/api.mjs';
import { boosting, parseLockParams, keyLock } from './contract/boosting.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('boosting: unlock_all.mjs', /** @this {MochaSuiteModified} */() => {
  const lockDuration = 2;
  const lockWxAmount = 1e3 * 1e8;
  let lockTxId;
  let lockHeight;

  before(async function () {
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: lockWxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    ({ id: lockTxId, height: lockHeight } = await boosting.lock({
      caller: this.accounts.user0.seed,
      duration: lockDuration,
      payments: [
        { assetId: this.wxAssetId, amount: lockWxAmount },
      ],
      chainId,
    }));
  });

  it('should successfully unlock', async function () {
    await waitForHeight(lockHeight + lockDuration + 1);
    const { stateChanges } = await boosting.unlock({
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

    const gwxAmountStart = boosting.calcGwxAmountStart({
      wxAmount: lockWxAmount,
      duration: lockDuration,
    });

    expect(lockParams.wxClaimed).to.equal(lockWxAmount, 'wxClaimed');
    expect(lockParams.gwxAmount).to.equal(gwxAmountStart, 'gwxAmount');
  });
});
