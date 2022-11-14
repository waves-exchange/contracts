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

describe('lp: putOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully putOneTkn with shouldAutoStake false', async function () {
    const usdnAmount = 10e6;
    const shibAmount = 10e2;
    const shouldAutoStake = false;

    const expectedLpAmount = 413859964;
    const expectedPriceLast = 50025012;
    const expectedPriceHistory = 50025012;
    const expectedFeeAmount = 1;
    const expectedInvokesCount = 2;

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

    const putOneTkn = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount },
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
    const {
      height, stateChanges, id, payment,
    } = await ni.waitForTx(putOneTkn.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);

    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    expect(payment).to.eql([{
      amount: shibAmount,
      assetId: this.shibAssetId,
    }]);

    expect(
      await checkStateChanges(stateChanges, 3, 2, 0, 0, 0, 0, 0, 0, 2),
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
      value: `%d%d%d%d%d%d%d%d%d%d__${shibAmount}__0__${expectedLpAmount}__${expectedPriceLast}__0__0__${height}__${timestamp}__0__0`,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.lpAssetId,
      amount: expectedLpAmount,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.shibAssetId,
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
      await checkStateChanges(invokes[1].stateChanges, 0, 1, 0, 1, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[1].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[1].call.function).to.eql('emit');
    expect(invokes[1].call.args).to.eql([
      {
        type: 'Int',
        value: expectedLpAmount,
      }]);
    expect(invokes[1].payment).to.eql([]);
    expect(invokes[1].stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.lp, chainId),
        asset: this.lpAssetId,
        amount: expectedLpAmount,
      }]);
    expect(invokes[1].stateChanges.reissues).to.eql([{
      assetId: this.lpAssetId,
      isReissuable: true,
      quantity: expectedLpAmount,
    }]);
  });
});
