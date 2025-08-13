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

describe('lp_stable: calculateAmountOutForSwapREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully calculateAmountOutForSwapREADONLY', async function () {
    const usdnAmount = 1e8;
    const usdtAmount = 1e8;
    const shouldAutoStake = false;

    const expected1 = { type: 'Int', value: 99257041 };

    const lpStable = address(this.accounts.lpStable, chainId);
    const swapAmount = 123e6;
    const feePoolAmount = 3e6;

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

    const expr = `calculateAmountOutForSwapREADONLY(${swapAmount}, false, ${feePoolAmount})`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(lpStable, expr);
    console.log(response.result);
    const checkData = response.result.value._2; /* eslint-disable-line */

    expect(checkData).to.eql(expected1); /* eslint-disable-line */
  });
});
