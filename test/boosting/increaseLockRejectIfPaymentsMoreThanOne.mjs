import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript,
  issue,
  massTransfer,
  nodeInteraction as ni,
  waitForTx,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: increaseLockRejectIfPaymentsMoreThanOne.mjs', /** @this {MochaSuiteModified} */() => {
  const seed = 'waves private node seed with waves tokens';
  let someAssetId;
  let user1;
  let boosting;
  let wxAssetId;

  before(async function () {
    user1 = this.accounts.user1;
    boosting = address(this.accounts.boosting, chainId);
    wxAssetId = this.wxAssetId;

    const someIssueTx = issue({
      name: 'Some Token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(someIssueTx, {});
    await waitForTx(someIssueTx.id, { apiBase });
    someAssetId = someIssueTx.id;

    const someAmount = 1e16;
    const massTransferTxWX = massTransfer({
      transfers: [{ recipient: address(user1, chainId), amount: someAmount }],
      assetId: someAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });
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
      }, this.accounts.user1);
      await api.transactions.broadcast(lockRefTx, {});
      await ni.waitForTx(lockRefTx.id, { apiBase });

      const increaseLockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
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
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(increaseLockTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
