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

describe('lp: getOneTknREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully getOneTknREADONLY with shouldAutoStake false', async function () {
    const lp = address(this.accounts.lp, chainId);

    const shibDecimals = 2;
    const shibAmount = 10e2;
    const usdnDecimals = 6;
    const usdnAmount = 25e6;
    const shouldAutoStake = false;

    const supplyLpAfterPut = Math.floor(
      Math.sqrt(
        (shibAmount * 10 ** shibDecimals) * (usdnAmount * 10 ** usdnDecimals),
      ),
    );

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

    const depositAmount = usdnAmount * 2;

    const putOneTkn = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.usdnAssetId, amount: depositAmount },
      ],
      call: {
        function: 'putOneTkn',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: shouldAutoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putOneTkn, {});
    const { stateChanges: stateChangesPutOneTkn } = await ni.waitForTx(putOneTkn.id, { apiBase });

    const lpAmountAfterPutOneTkn = stateChangesPutOneTkn.transfers[0].amount;
    const { balance: balanceUsdn } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.usdnAssetId,
    );

    const supplyLp = supplyLpAfterPut + lpAmountAfterPutOneTkn;

    const withdrawAmount = Math.floor(
      balanceUsdn * (1 - (1 - lpAmountAfterPutOneTkn / supplyLp) ** 2),
    );
    const scale8 = 1e8;
    const feeDefaultAmount = (10 * scale8) / 1e4;
    const feeAmount = Math.floor((withdrawAmount * feeDefaultAmount) / scale8);

    const expectedUsdnAmount = withdrawAmount - feeAmount;
    const expectedFeeAmount = feeAmount;
    const expectedLost = -21201733;

    const expr = `getOneTknREADONLY(\"${this.usdnAssetId}\", ${lpAmountAfterPutOneTkn})`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(lp, expr);
    const checkData = response.result.value._2.value;  /* eslint-disable-line */

    expect(Object.keys(checkData).length).to.eql(3);
    expect(checkData._1.value).to.eql(expectedUsdnAmount); /* eslint-disable-line */
    expect(checkData._2.value).to.eql(expectedFeeAmount); /* eslint-disable-line */
    expect(checkData._3.value).to.eql(expectedLost); /* eslint-disable-line */
  });
});
