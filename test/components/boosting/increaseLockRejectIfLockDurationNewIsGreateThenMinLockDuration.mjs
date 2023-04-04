import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  data,
  transfer,
  reissue,
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: increaseLockRejectIfLockDurationNewIsGreateThenMinLockDuration.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject increaseLock',
    async function () {
      const deltaDuration = this.maxDuration + 1;
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const referrer = '';
      const signature = 'base64:';

      const expectedRejectMessage = `deltaDuration + existedLockDuration is greater then maxLockDuration=${this.maxDuration}`;

      const lpAssetAmount = 1e3 * 1e8;
      const wxAmount = 1e3 * 1e8;

      await broadcastAndWait(transfer({
        recipient: this.accounts.user0.addr,
        amount: wxAmount,
        assetId: this.wxAssetId,
        additionalFee: 4e5,
      }, this.accounts.emission.seed));

      const lpAssetIssueTx = reissue({
        assetId: this.lpAssetId,
        quantity: lpAssetAmount * 10,
        reissuable: true,
        chainId,
      }, this.accounts.factory.seed);
      await broadcastAndWait(lpAssetIssueTx);

      const lpAssetTransferTx = transfer({
        recipient: this.accounts.user0.addr,
        amount: lpAssetAmount,
        assetId: this.lpAssetId,
        additionalFee: 4e5,
      }, this.accounts.factory.seed);
      await broadcastAndWait(lpAssetTransferTx);

      const lockRefTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lockRef',
          args: [
            { type: 'integer', value: duration },
            { type: 'string', value: referrer },
            { type: 'binary', value: signature },
          ],
        },
        chainId,
      }, this.accounts.user0.seed);
      await broadcastAndWait(lockRefTx);

      const setLockTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: `%s%s__lock__${address(this.accounts.user0, chainId)}`,
            type: 'string',
            value: '%d%d%d%d%d%d%d%d__0__0__0__0__0__0__0__0',
          },
        ],
        chainId,
      }, this.accounts.boosting.seed);
      await broadcastAndWait(setLockTx);

      const increaseLockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'increaseLock',
          args: [
            { type: 'integer', value: deltaDuration },
          ],
        },
        chainId,
      }, this.accounts.user0.seed);

      await expect(
        api.transactions.broadcast(increaseLockTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: boosting.ride: ${expectedRejectMessage}`,
      );
    },
  );
});
