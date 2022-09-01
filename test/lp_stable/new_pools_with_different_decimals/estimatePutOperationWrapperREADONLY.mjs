import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { address } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';
const api = create(apiBase);

describe(
  'lp_stable: estimatePutOperationWrapperREADONLY.mjs',
  /** @this {MochaSuiteModified} */() => {
    it('should successfully estimatePutOperationWrapperREADONLY', async function () {
      const txId58 = '\"\"'; /* eslint-disable-line */
      const slippage = 500000;
      const inAmAmt = 1e8;
      const inAmId = this.usdtAssetId;
      const inPrAmt = 1e8;
      const inPrId = this.usdnAssetId;
      const usrAddr = '\"\"'; /* eslint-disable-line */
      const isEval = true;
      const emitLp = false;

      const expected1 = { type: 'Int', value: 1000000000 }; // outLp
      const expected2 = { type: 'Int', value: 0 }; // emitLpAmount
      const expected3 = { type: 'Int', value: 10000000000 }; // currentPrice
      const expected4 = { type: 'Int', value: 0 }; // amountBalance
      const expected5 = { type: 'Int', value: 0 }; // priceBalance
      const expected6 = { type: 'Int', value: 0 }; // lpEmission
      const expected7 = { type: 'ByteVector', value: this.lpStableAssetId }; // lpAssetId
      const expected8 = { type: 'String', value: '1' }; // sts
      const expected9 = {
        type: 'IntegerEntry',
        value: {
          key: {
            type: 'String',
            value: '%s%s__price__last',
          },
          value: {
            type: 'Int',
            value: 10000000000,
          },
        },
      };

      const expected10 = { type: 'Int', value: 0 }; // amountDiff
      const expected11 = { type: 'Int', value: 0 }; // priceDiff
      const expected12 = { type: 'String', value: this.usdtAssetId }; // inAmountAssetId
      const expected13 = { type: 'String', value: this.usdnAssetId }; // inPriceAssetId

      const lpStable = address(this.accounts.lpStable, chainId);

      const expr = `estimatePutOperationWrapperREADONLY(${txId58}, ${slippage}, ${inAmAmt}, \"${inAmId}\", ${inPrAmt}, \"${inPrId}\", ${usrAddr}, ${isEval}, ${emitLp})`; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(lpStable, expr);
      const checkData = response.result.value._2.value;  /* eslint-disable-line */

      expect(checkData._1).to.eql(expected1); /* eslint-disable-line */
      expect(checkData._2).to.eql(expected2); /* eslint-disable-line */
      expect(checkData._3).to.eql(expected3); /* eslint-disable-line */
      expect(checkData._4).to.eql(expected4); /* eslint-disable-line */
      expect(checkData._5).to.eql(expected5); /* eslint-disable-line */
      expect(checkData._6).to.eql(expected6); /* eslint-disable-line */
      expect(checkData._7).to.eql(expected7); /* eslint-disable-line */
      expect(checkData._8).to.eql(expected8); /* eslint-disable-line */
      expect(checkData._9.value[0]).to.eql(expected9); /* eslint-disable-line */
      expect(checkData._10).to.eql(expected10); /* eslint-disable-line */
      expect(checkData._11).to.eql(expected11); /* eslint-disable-line */
      expect(checkData._12).to.eql(expected12); /* eslint-disable-line */
      expect(checkData._13).to.eql(expected13); /* eslint-disable-line */
    });
  },
);
