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

describe('lp: getNoLessRejectIfNoLessThenAmtAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject get. The put method uses the shouldAutoStake argument with a value of false',
    async function () {
      const usdnAmount = 10e6;
      const shibAmount = 10e2;
      const lpAmount = 1e9;
      const shouldAutoStake = false;
      const noLessThenAmtAsset = 1e3 + 1;
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

      const getNoLess = invokeScript({
        dApp: lp,
        payment: [
          { assetId: this.lpAssetId, amount: lpAmount },
        ],
        call: {
          function: 'getNoLess',
          args: [
            { type: 'integer', value: noLessThenAmtAsset },
            { type: 'integer', value: noLessThenPriceAsset },
          ],
        },
        chainId,
      }, this.accounts.user1);

      const expectedOutAmAmt = 1e3;
      const expectedRejectMessage = `noLessThenAmtAsset failed:  ${expectedOutAmAmt} < ${noLessThenAmtAsset}`;

      await expect(
        api.transactions.broadcast(getNoLess, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
      );
    },
  );
});
