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

describe('lp_stable: getOneTknV2READONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully getOneTknV2READONLY', async function () {
    const autoStake = false;
    const usdtAmount = 10e6;
    const usdnAmount = 30e6;
    const minOutAmount = 0;

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

    const putOneTknV2 = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
      ],
      call: {
        function: 'putOneTknV2',
        args: [
          { type: 'integer', value: minOutAmount },
          { type: 'boolean', value: autoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putOneTknV2, {});
    const { stateChanges: stateChangesPutOneTkn } = await ni.waitForTx(putOneTknV2.id, { apiBase });

    const lpAmountAfterPutOneTkn = stateChangesPutOneTkn.transfers[0].amount;

    const expr = `getOneTknV2READONLY(\"${this.usdnAssetId}\", ${lpAmountAfterPutOneTkn})`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(lpStable, expr);
    const checkData = response.result.value._2.value;  /* eslint-disable-line */

    const expectedUsdnAmount = 9986659;
    const expectedFeeAmount = 9996;

    expect(Object.keys(checkData).length).to.eql(2);
    expect(checkData._1.value).to.eql(expectedUsdnAmount); /* eslint-disable-line */
    expect(checkData._2.value).to.eql(expectedFeeAmount); /* eslint-disable-line */
  });
});
