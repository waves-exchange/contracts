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

describe('lp_stable: getOneTknV2WithBonusREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully getOneTknV2WithBonusREADONLY',
    async function () {
      const usdnAmount = 1e8 / 10;
      const usdtAmount = 1e8 / 10;
      const shouldAutoStake = false;
      const lpStableAmount = 100000000;

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

      const expr = `getOneTknV2WithBonusREADONLY("${this.usdtAssetId}", ${lpStableAmount})`; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(
        lpStable,
        expr,
      );
      const evaluateData = response.result.value._2; /* eslint-disable-line */

      expect(evaluateData).to.eql({
        type: 'Tuple',
        value: {
          _1: {
            type: 'Int',
            value: '2964892755865620',
          },
          _2: {
            type: 'Int',
            value: 2967860616482,
          },
        },
      });
    },
  );
});
