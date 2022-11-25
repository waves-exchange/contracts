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

describe('lp: getOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully getOneTkn with shouldAutoStake false', async function () {
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

    const getOneTkn = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.lpAssetId, amount: lpAmountAfterPutOneTkn },
      ],
      call: {
        function: 'getOneTkn',
        args: [
          { type: 'string', value: this.usdnAssetId },
          { type: 'integer', value: 0 },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getOneTkn, {});
    const {
      height, stateChanges, id, payment,
    } = await ni.waitForTx(getOneTkn.id, { apiBase });

    const supplyLp = supplyLpAfterPut + lpAmountAfterPutOneTkn;

    const withdrawAmount = Math.floor(
      balanceUsdn * (1 - (1 - lpAmountAfterPutOneTkn / supplyLp) ** 2),
    );
    const scale8 = 1e8;
    const feeDefaultAmount = (10 * scale8) / 1e4;
    const feeAmount = Math.floor((withdrawAmount * feeDefaultAmount) / scale8);

    const { timestamp } = await api.blocks.fetchHeadersAt(height);
    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    const { balance: balanceShibAfterPutOneTkn } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.shibAssetId,
    );
    const { balance: balanceUsdnAfterPutOneTkn } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.usdnAssetId,
    );

    const expectedUsdnAmount = withdrawAmount - feeAmount;
    const expectedPriceLast = Math.floor(
      (balanceUsdnAfterPutOneTkn * 10 ** usdnDecimals)
      / (balanceShibAfterPutOneTkn * 10 ** shibDecimals),
    );
    const expectedPriceHistory = expectedPriceLast;
    const expectedFeeAmount = feeAmount;
    const expectedInvokesCount = 2;

    expect(payment).to.eql([{
      amount: lpAmountAfterPutOneTkn,
      assetId: this.lpAssetId,
    }]);

    expect(
      await checkStateChanges(stateChanges, 3, 2, 0, 0, 0, 0, 0, 0, 2),
    ).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d__0__${expectedUsdnAmount}__${lpAmountAfterPutOneTkn}__${expectedPriceLast}__${height}__${timestamp}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: expectedUsdnAmount,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.usdnAssetId,
      amount: expectedFeeAmount,
    }]);

    const { invokes } = stateChanges;
    expect(invokes.length).to.eql(expectedInvokesCount);

    expect(
      await checkStateChanges(invokes[0].stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[0].call.function).to.eql('isPoolOneTokenOperationsDisabledREADONLY');
    expect(invokes[0].call.args).to.eql([
      {
        type: 'String',
        value: lp,
      }]);
    expect(invokes[0].payment).to.eql([]);

    expect(
      await checkStateChanges(invokes[1].stateChanges, 0, 0, 0, 0, 1, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[1].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[1].call.function).to.eql('burn');
    expect(invokes[1].call.args).to.eql([
      {
        type: 'Int',
        value: lpAmountAfterPutOneTkn,
      }]);
    expect(invokes[1].payment).to.eql([
      {
        amount: lpAmountAfterPutOneTkn,
        assetId: this.lpAssetId,
      },
    ]);
    expect(invokes[1].stateChanges.burns).to.eql([
      {
        assetId: this.lpAssetId,
        quantity: lpAmountAfterPutOneTkn,
      }]);
  });
});
