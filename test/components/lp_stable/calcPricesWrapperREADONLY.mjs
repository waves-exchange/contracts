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

describe('lp_stable: calcPricesWrapperREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully calcPricesWrapperREADONLY',
    async function () {
      const usdnAmount = 1e8;
      const usdtAmount = 1e8;
      const shouldAutoStake = false;

      const lpStable = address(this.accounts.lpStable, chainId);

      const put = invokeScript({
        dApp: lpStable,
        payment: [
          { assetId: this.usdtAssetId, amount: usdtAmount },
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

      const expr1 = `calcPricesWrapperREADONLY(1000000, 1100000, 100000000)`; /* eslint-disable-line */
      const response1 = await api.utils.fetchEvaluate(
        lpStable,
        expr1,
      );
      const evaluateData1 = response1.result.value._2; /* eslint-disable-line */

      expect(evaluateData1).to.eql({
        type: 'Array',
        value: [
          {
            type: 'String',
            value: '1100000000000000000',
          },
          {
            type: 'String',
            value: '1000000000000000000',
          },
          {
            type: 'String',
            value: '1100000000000000000',
          },
        ],
      });
    },
  );
});
