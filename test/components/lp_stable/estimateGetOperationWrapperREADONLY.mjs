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

describe('lp_stable: estimateGetOperationWrapperREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully estimateGetOperationWrapperREADONLY', async function () {
    const usdnAmount = 1e8;
    const usdtAmount = 1e8;
    const shouldAutoStake = false;
    const txId58 = '\"\"'; /* eslint-disable-line */
    const pmtAsId = this.lpStableAssetId;
    const pmtLpAmt = 10;

    const expected1 = { type: 'Int', value: 0 };
    const expected2 = { type: 'Int', value: 0 };
    const expected3 = { type: 'String', value: this.usdtAssetId };
    const expected4 = { type: 'String', value: this.usdnAssetId };
    const expected5 = { type: 'Int', value: 1e8 };
    const expected6 = { type: 'Int', value: 1e8 };
    const expected7 = { type: 'Int', value: 2e10 };
    const expected8 = { type: 'String', value: '1000000000000000000' };
    const expected9 = { type: 'String', value: '1' };
    const expected10 = { type: 'Array', value: [] };

    const usrAddr = address(this.accounts.user1, chainId);
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

    const expr = `estimateGetOperationWrapperREADONLY(${txId58}, \"${pmtAsId}\", ${pmtLpAmt}, \"${usrAddr}\")`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(lpStable, expr);
    const checkData = response.result.value._2.value; /* eslint-disable-line */

    expect(checkData._1).to.eql(expected1); /* eslint-disable-line */
    expect(checkData._2).to.eql(expected2); /* eslint-disable-line */
    expect(checkData._3).to.eql(expected3); /* eslint-disable-line */
    expect(checkData._4).to.eql(expected4); /* eslint-disable-line */
    expect(checkData._5).to.eql(expected5); /* eslint-disable-line */
    expect(checkData._6).to.eql(expected6); /* eslint-disable-line */
    expect(checkData._7).to.eql(expected7); /* eslint-disable-line */
    expect(checkData._8).to.eql(expected8); /* eslint-disable-line */
    expect(checkData._9).to.eql(expected9); /* eslint-disable-line */
    expect(checkData._10).to.eql(expected10); /* eslint-disable-line */
  });
});
