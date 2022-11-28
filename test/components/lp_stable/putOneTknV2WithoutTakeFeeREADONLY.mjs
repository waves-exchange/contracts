import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_stable: putOneTknV2WithoutTakeFeeREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully putOneTknV2WithoutTakeFeeREADONLY with autoStake false', async function () {
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;

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
          { type: 'boolean', value: false },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(put, {});
    await ni.waitForTx(put.id, { apiBase });

    const expectedLpAmount = 4999063600;
    const expectedFeeAmount = 0;
    const expectedLost = -18728;

    const expr = `putOneTknV2WithoutTakeFeeREADONLY(${usdnAmount}, \"${this.usdnAssetId}\")`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(lpStable, expr);
    const checkData = response.result.value._2.value;  /* eslint-disable-line */

    expect(Object.keys(checkData).length).to.eql(3);
    expect(checkData._1.value).to.eql(expectedLpAmount); /* eslint-disable-line */
    expect(checkData._2.value).to.eql(expectedFeeAmount); /* eslint-disable-line */
    expect(checkData._3.value).to.eql(expectedLost); /* eslint-disable-line */
  });
});
