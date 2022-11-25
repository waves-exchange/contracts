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

describe('lp_stable: putOneTknV2AutoStake.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully putOneTknV2 with autoStake true', async function () {
    const minOutAmount = 1e8;
    const slippage = 0;
    const autoStake = true;
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;

    const expectedPriceLast = 50025012;
    const expectedPriceHistory = 50025012;
    const expectedWriteAmAmt = 1e8;
    const expectedWritePrAmt = 0;
    const expectedEmitLpAmt = 4994065300;
    const expectedFee = 100000;
    const expectedSlippageCalc = 0;
    const expectedAmDiff = 0;
    const expectedPrDiff = 0;
    const expectedInvokesCount = 3;

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

    const putOneTkn = invokeScript({
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
    await api.transactions.broadcast(putOneTkn, {});
    const {
      height, stateChanges, id, payment,
    } = await ni.waitForTx(putOneTkn.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);
    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    expect(payment).to.eql([{
      amount: usdtAmount,
      assetId: this.usdtAssetId,
    }]);

    expect(
      await checkStateChanges(stateChanges, 3, 1, 0, 0, 0, 0, 0, 0, 3),
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
      value: `%d%d%d%d%d%d%d%d%d%d__${expectedWriteAmAmt}__${expectedWritePrAmt}__${expectedEmitLpAmt}__${expectedPriceLast}__${slippage}__${expectedSlippageCalc}__${height}__${timestamp}__${expectedAmDiff}__${expectedPrDiff}`,
    }]);

    expect(stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.feeCollector, chainId),
        asset: this.usdtAssetId,
        amount: expectedFee,
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
        value: lpStable,
      }]);
    expect(invokes[0].payment).to.eql([]);

    expect(
      await checkStateChanges(invokes[1].stateChanges, 0, 1, 0, 1, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[1].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[1].call.function).to.eql('emit');
    expect(invokes[1].call.args).to.eql([
      {
        type: 'Int',
        value: expectedEmitLpAmt,
      }]);
    expect(invokes[1].payment).to.eql([]);
    expect(invokes[1].stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.lpStable, chainId),
        asset: this.lpStableAssetId,
        amount: expectedEmitLpAmt,
      }]);
    expect(invokes[1].stateChanges.reissues).to.eql([{
      assetId: this.lpStableAssetId,
      isReissuable: true,
      quantity: expectedEmitLpAmt,
    }]);

    expect(
      await checkStateChanges(invokes[2].stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[2].dApp).to.eql(address(this.accounts.staking, chainId));
    expect(invokes[2].call.function).to.eql('stake');
    expect(invokes[2].call.args).to.eql([]);
    expect(invokes[2].payment).to.eql([{
      amount: expectedEmitLpAmt,
      assetId: this.lpStableAssetId,
    }]);
  });
});
