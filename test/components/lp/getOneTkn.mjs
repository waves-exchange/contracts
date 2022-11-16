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
    const usdnAmount = 10e6;
    const shibAmount = 30e2;
    const shouldAutoStake = false;

    const expectedLpAmount = 716826485;
    const expectedPriceLast = 50025012;
    const expectedPriceHistory = 50025012;
    const expectedFeeAmount = 1;
    const expectedInvokesCount = 2;

    const lpAmount = expectedLpAmount;

    const lp = address(this.accounts.lp, chainId);

    const put = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: 96966035087 },
        { assetId: this.usdnAssetId, amount: 9280844907 },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: shouldAutoStake },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(put, {});
    const { stateChanges: stateChangesPut } = await ni.waitForTx(put.id, { apiBase });

    const putOneTkn = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.usdnAssetId, amount: 5000e6 },
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

    const getOneTkn = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.lpAssetId, amount: 72070281921159 },
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
    const { height, stateChanges, id } = await ni.waitForTx(getOneTkn.id, { apiBase });

    const getOneTkn2 = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.lpAssetId, amount: 10e8 },
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
    await api.transactions.broadcast(getOneTkn2, {});
    await ni.waitForTx(getOneTkn2.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);
    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    expect(
      await checkStateChanges(stateChanges, 3, 2, 0, 0, 0, 0, 0, 0, 1),
    ).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${shibAmount}__0__${lpAmount}__${expectedPriceLast}__${height}__${timestamp}`,
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
      asset: this.shibAssetId,
      amount: shibAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes } = stateChanges;
    expect(invokes.length).to.eql(expectedInvokesCount);

    expect(
      await checkStateChanges(invokes[0].stateChanges, 0, 0, 0, 0, 1, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[0].call.function).to.eql('burn');
    expect(invokes[0].call.args).to.eql([
      {
        type: 'Int',
        value: lpAmount,
      }]);
    expect(invokes[0].payment).to.eql([
      {
        amount: lpAmount,
        assetId: this.lpAssetId,
      },
    ]);
    expect(invokes[0].stateChanges.burns).to.eql([
      {
        assetId: this.lpAssetId,
        quantity: lpAmount,
      }]);
  });
});
