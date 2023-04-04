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

import { broadcastAndWait, waitForHeight } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: unlockRejectIfNothingToUnlock.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject unlock',
    async function () {
      const duration = 3;
      const assetAmount = this.minLockAmount;

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

      const lockTx = invokeScript({
        dApp: this.accounts.boosting.addr,
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lock',
          args: [
            { type: 'integer', value: duration },
          ],
        },
        chainId,
      }, this.accounts.user0.seed);
      const { height } = await broadcastAndWait(lockTx);

      const expectedRejectMessage = 'nothing to unlock';

      const setLockTx = data({
        additionalFee: 4e5,
        data: [{
          key: `%s%s__lock__${address(this.accounts.user0, chainId)}`,
          type: 'string',
          value: '%d%d%d%d%d%d%d%d__0__0__0__0__0__0__0__0',
        }],
        chainId,
      }, this.accounts.boosting.seed);
      await broadcastAndWait(setLockTx);

      await waitForHeight(height + duration);

      const unlockTx = invokeScript({
        dApp: this.accounts.boosting.addr,
        payment: [],
        call: {
          function: 'unlock',
          args: [
            { type: 'string', value: address(this.accounts.user0, chainId) },
          ],
        },
        chainId,
      }, this.accounts.user0.seed);

      await expect(
        api.transactions.broadcast(unlockTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: boosting.ride: ${expectedRejectMessage}`,
      );
    },
  );
});
