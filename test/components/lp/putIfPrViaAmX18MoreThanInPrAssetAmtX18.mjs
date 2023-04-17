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

describe('lp: putIfPrViaAmX18MoreThanInPrAssetAmtX18.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully put with shouldAutoStake false', async function () {
    const usdnAmount = 10e6;
    const shibAmount = 10e2;
    const shouldAutoStake = false;
    const slippageTolerance = 1e8;

    const expectedLpAmount = 1e9;
    const expectedPriceLast = 1e8;
    const expectedPriceHistory = 1e8;
    const expectedInvokesCount = 3;
    const expectedSlippageToleranceReal = 5e7;
    const expectedSlippageAmtAssetAmt = 1e3;

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

    const putSecond = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount * 2 },
        { assetId: this.usdnAssetId, amount: usdnAmount },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: slippageTolerance },
          { type: 'boolean', value: shouldAutoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putSecond, {});
    const { height, stateChanges, id } = await ni.waitForTx(putSecond.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);
    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    expect(
      await checkStateChanges(stateChanges, 5, 1, 0, 0, 0, 0, 0, 0, expectedInvokesCount),
    ).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistory,
    }, {
      key: `%s%s%s__P__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__${shibAmount}__${usdnAmount}__${expectedLpAmount}__${expectedPriceLast}__${slippageTolerance}__${expectedSlippageToleranceReal}__${height}__${timestamp}__${expectedSlippageAmtAssetAmt}__0`,
    }, {
      key: '%s__kLpRefreshedHeight',
      type: 'integer',
      value: height,
    }, {
      key: '%s__kLp',
      type: 'string',
      value: '10000000000000000000000000000',
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.lpAssetId,
      amount: expectedLpAmount,
    }]);

    const { invokes } = stateChanges;
    expect(invokes.length).to.eql(expectedInvokesCount);

    expect(
      await checkStateChanges(invokes[0].stateChanges, 0, 1, 0, 1, 0, 0, 0, 0, 0),
    ).to.eql(true);
    expect(invokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[0].call.function).to.eql('emit');
    expect(invokes[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedLpAmount,
      }]);
    expect(invokes[0].payment).to.eql([]);
    expect(invokes[0].stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.lp, chainId),
        asset: this.lpAssetId,
        amount: expectedLpAmount,
      }]);

    expect(
      await checkStateChanges(invokes[1].stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ).to.eql(true);
    expect(invokes[1].dApp).to.eql(address(this.accounts.slippage, chainId));
    expect(invokes[1].call.function).to.eql('put');
    expect(invokes[1].call.args).to.eql([]);
    expect(invokes[1].payment).to.eql([
      {
        assetId: this.shibAssetId,
        amount: expectedSlippageAmtAssetAmt,
      },
    ]);
  });
});
