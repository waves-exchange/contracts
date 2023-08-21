import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  transfer,
  invokeScript,
} from '@waves/waves-transactions';

import { broadcastAndWait, chainId, separator } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('boosting: lock.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully lock',
    async function () {
      const boosting = this.accounts.boosting.addr;
      const lockDuration = 3;

      const lockWxAmount = 1e3 * 1e8;

      await broadcastAndWait(transfer({
        recipient: this.accounts.user0.addr,
        amount: lockWxAmount,
        assetId: this.wxAssetId,
        additionalFee: 4e5,
      }, this.accounts.emission.seed));

      const { stateChanges, id: lockTxId } = await broadcastAndWait(invokeScript({
        dApp: boosting,
        call: {
          function: 'lock',
          args: [
            { type: 'integer', value: lockDuration },
          ],
        },
        payment: [
          { assetId: this.wxAssetId, amount: lockWxAmount },
        ],
        chainId,
      }, this.accounts.user0.seed));

      const keyLock = (userAddress, txId) => ['%s%s%s', 'lock', userAddress, txId].join(separator);
      const parseLockParams = (s) => {
        const [
          meta,
          wxAmount,
          startHeight,
          duration,
          lastUpdateTimestamp,
          gwxAmount,
          wxClaimed,
        ] = s.split(separator);

        return {
          meta,
          wxAmount: parseInt(wxAmount, 10),
          startHeight: parseInt(startHeight, 10),
          duration: parseInt(duration, 10),
          gwxAmount: parseInt(gwxAmount, 10),
          wxClaimed: parseInt(wxClaimed, 10),
          lastUpdateTimestamp: parseInt(lastUpdateTimestamp, 10),
        };
      };
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
    },
  );
});
