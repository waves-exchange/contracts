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

describe('lp_stable: getOneTknV2.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully getOneTknV2.', async function () {
    const autoStake = false;
    const usdtAmount = 10e6;
    const usdnAmount = 30e6;
    const minOutAmount = 0;

    const expectedLpAmount = 2164945633;
    const expectedPriceLast = '3000000000000000';
    const expectedPriceHistory = '3000000000000000';
    const expectedOutAmAmt = 19970010;
    const expectedFee = 19989;
    const expectedOutPrAmt = 0;
    const expectedInvokesCount = 3;

    const lpAmount = expectedLpAmount;

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
    await ni.waitForTx(putOneTknV2.id, { apiBase });

    const getOneTknV2 = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.lpStableAssetId, amount: lpAmount },
      ],
      call: {
        function: 'getOneTknV2',
        args: [
          { type: 'string', value: this.usdtAssetId },
          { type: 'integer', value: minOutAmount },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getOneTknV2, {});
    const {
      height: heightAfterGetOneTkn,
      stateChanges,
      id,
      payment,
    } = await ni.waitForTx(getOneTknV2.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(heightAfterGetOneTkn);
    const keyPriceHistory = `%s%s%d%d__price__history__${heightAfterGetOneTkn}__${timestamp}`;

    expect(payment).to.eql([{
      amount: lpAmount,
      assetId: this.lpStableAssetId,
    }]);

    expect(
      await checkStateChanges(stateChanges, 3, 2, 0, 0, 0, 0, 0, 0, 3),
    ).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${expectedOutAmAmt}__${expectedOutPrAmt}__${expectedLpAmount}__${expectedPriceLast}__${heightAfterGetOneTkn}__${timestamp}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.user1, chainId),
        asset: this.usdtAssetId,
        amount: expectedOutAmAmt,
      },
      {
        address: address(this.accounts.feeCollector, chainId),
        asset: this.usdtAssetId,
        amount: expectedFee,
      },
    ]);

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
        value: address(this.accounts.lpStable, chainId),
      }]);
    expect(invokes[0].payment).to.eql([]);

    expect(
      await checkStateChanges(invokes[1].stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[1].dApp).to.eql(lpStable);
    expect(invokes[1].call.function).to.eql('getOneTknV2READONLY');
    expect(invokes[1].call.args).to.eql([
      {
        type: 'String',
        value: this.usdtAssetId,
      }, {
        type: 'Int',
        value: lpAmount,
      }]);
    expect(invokes[1].payment).to.eql([]);

    expect(
      await checkStateChanges(invokes[2].stateChanges, 0, 0, 0, 0, 1, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[2].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[2].call.function).to.eql('burn');
    expect(invokes[2].call.args).to.eql([
      {
        type: 'Int',
        value: lpAmount,
      }]);
    expect(invokes[2].payment).to.eql([
      {
        amount: lpAmount,
        assetId: this.lpStableAssetId,
      },
    ]);
    expect(invokes[2].stateChanges.burns).to.eql([
      {
        assetId: this.lpStableAssetId,
        quantity: lpAmount,
      }]);
  });
});
