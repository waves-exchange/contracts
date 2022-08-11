import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: lockRefRejectIfIsActiveLock.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject lockRef',
    async function () {
      const duration = this.maxDuration - 1;
      const referrer = '';
      const signature = '';
      const assetAmount = this.minLockAmount;

      const expectedRejectMessage = 'there is an active lock - consider to use increaseLock';

      const fisrtLockRefTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lockRef',
          args: [
            { type: 'integer', value: duration },
            { type: 'string', value: referrer },
            { type: 'string', value: signature },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await api.transactions.broadcast(fisrtLockRefTx, {});
      await ni.waitForTx(fisrtLockRefTx.id, { apiBase });

      const setParamByUserNumStartTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: `%s%d%s__paramByUserNum__0__start__${this.accounts.assetAmount}`,
            type: 'integer',
            value: 0,
          },
        ],
        chainId,
      }, this.accounts.emission);
      await api.transactions.broadcast(setParamByUserNumStartTx, {});
      await ni.waitForTx(setParamByUserNumStartTx.id, { apiBase });

      const setParamByUserNumDurationTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: `%s%d%s__paramByUserNum__0__duration__${this.accounts.assetAmount}`,
            type: 'integer',
            value: 0,
          },
        ],
        chainId,
      }, this.accounts.emission);
      await api.transactions.broadcast(setParamByUserNumDurationTx, {});
      await ni.waitForTx(setParamByUserNumDurationTx.id, { apiBase });

      const setParamByUserNumAmountTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: `%s%d%s__paramByUserNum__0__amount__${this.accounts.assetAmount}`,
            type: 'integer',
            value: assetAmount,
          },
        ],
        chainId,
      }, this.accounts.emission);
      await api.transactions.broadcast(setParamByUserNumAmountTx, {});
      await ni.waitForTx(setParamByUserNumAmountTx.id, { apiBase });

      const secondLockRefTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lockRef',
          args: [
            { type: 'integer', value: duration },
            { type: 'string', value: referrer },
            { type: 'string', value: signature },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(secondLockRefTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
