import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: unlockRejectIfLockMoreHeight.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject unlock',
    async function () {
      const duration = this.maxDuration - 1;
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

      const expectedRejectMessage = `wait ${height + duration} to unlock`;

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

      await expect(api.transactions.broadcast(unlockTx, {})).to.be.rejectedWith(
        expectedRejectMessage,
      );
    },
  );
});
