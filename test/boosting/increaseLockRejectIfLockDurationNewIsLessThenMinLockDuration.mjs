import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import {
  data,
  invokeScript,
  nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: increaseLockRejectIfDurationIsLessThenZero.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject increaseLock',
    async function () {
      const deltaDuration = 1;
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const referrer = '';
      const signature = 'base64:';

      const expectedRejectMessage = `lockDurationNew is less then minLockDuration=${this.minDuration}`;

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
      }, this.accounts.user1);
      await api.transactions.broadcast(lockRefTx, {});
      await ni.waitForTx(lockRefTx.id, { apiBase });

      const setLockTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: `%s%s__lock__${address(this.accounts.user1, chainId)}`,
            type: 'string',
            value: '%d%d%d%d%d%d%d%d__0__0__0__0__0__0__0__0',
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setLockTx, {});
      await ni.waitForTx(setLockTx.id, { apiBase });

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
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(increaseLockTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
