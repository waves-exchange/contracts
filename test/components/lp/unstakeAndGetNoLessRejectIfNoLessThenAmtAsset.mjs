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

describe('lp: unstakeAndGetNoLessRejectIfNoLessThenPriceAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject unstakeAndGetNoLess. The put method uses the shouldAutoStake argument with a value of true',
    async function () {
      const usdnAmount = 10e6;
      const shibAmount = 10e2;
      const lpAmount = 1e9;
      const shouldAutoStake = true;

      const noLessThenAmountAsset = 1e3 + 1;
      const noLessThenPriceAsset = 1e2;

      const lp = address(this.accounts.lp, chainId);

      const put = invokeScript({
        dApp: lp,
        payment: [
          { assetId: this.shibAssetId, amount: shibAmount },
          { assetId: this.usdnAssetId, amount: usdnAmount },
        ],
        call: {
          function: 'put',
          args: [
            { type: 'integer', value: 0 },
            { type: 'boolean', value: shouldAutoStake },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(put, {});
      await ni.waitForTx(put.id, { apiBase });

      const unstakeAndGetNoLess = invokeScript({
        dApp: lp,
        call: {
          function: 'unstakeAndGetNoLess',
          args: [
            { type: 'integer', value: lpAmount },
            { type: 'integer', value: noLessThenAmountAsset },
            { type: 'integer', value: noLessThenPriceAsset },
          ],
        },
        chainId,
      }, this.accounts.user1);

      const expectedRejectMessage = `amount asset amount to receive is less than ${noLessThenAmountAsset}`;

      await expect(
        api.transactions.broadcast(unstakeAndGetNoLess, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
      );
    },
  );
});
