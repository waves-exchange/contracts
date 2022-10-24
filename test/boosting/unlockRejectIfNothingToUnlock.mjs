import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { waitForHeight } from '../api.mjs';

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

      const lockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
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
      }, this.accounts.user1);
      await api.transactions.broadcast(lockTx, {});
      const { height } = await ni.waitForTx(lockTx.id, { apiBase });

      const expectedRejectMessage = 'nothing to unlock';

      const setLockTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [{
          key: `%s%s__lock__${address(this.accounts.user1, chainId)}`,
          type: 'string',
          value: '%d%d%d%d%d%d%d%d__0__0__0__0__0__0__0__0',
        }],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setLockTx, {});
      await ni.waitForTx(setLockTx.id, { apiBase });

      await waitForHeight(height + duration);

      const unlockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [],
        call: {
          function: 'unlock',
          args: [
            { type: 'string', value: address(this.accounts.user1, chainId) },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(unlockTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: ${expectedRejectMessage}`,
      );
    },
  );
});
