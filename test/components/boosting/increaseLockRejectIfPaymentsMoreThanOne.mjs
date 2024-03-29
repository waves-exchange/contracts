import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  transfer,
  massTransfer,
  issue,
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

describe('boosting: increaseLockRejectIfPaymentsMoreThanOne.mjs', /** @this {MochaSuiteModified} */() => {
  const seed = 'waves private node seed with waves tokens';
  let someAssetId;
  let user0;
  let boosting;
  let wxAssetId;

  before(async function () {
    user0 = this.accounts.user0;
    boosting = this.accounts.boosting.addr;
    wxAssetId = this.wxAssetId;

    const someIssueTx = issue({
      name: 'Some Token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, seed);
    await broadcastAndWait(someIssueTx);
    someAssetId = someIssueTx.id;

    const someAmount = 1e16;
    const massTransferTxWX = massTransfer({
      transfers: [{ recipient: address(user0, chainId), amount: someAmount }],
      assetId: someAssetId,
      chainId,
    }, seed);
    await broadcastAndWait(massTransferTxWX);
  });
  it(
    'should reject increaseLock',
    async function () {
      const deltaDuration = 0;
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const referrer = '';
      const signature = 'base64:';

      const expectedRejectMessage = 'only one payment is allowed';

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
        dApp: boosting,
        payment: [
          { assetId: wxAssetId, amount: assetAmount },
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

      const increaseLockTx = invokeScript({
        dApp: this.accounts.boosting.addr,
        payment: [
          { assetId: wxAssetId, amount: assetAmount },
          { assetId: someAssetId, amount: assetAmount },
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
