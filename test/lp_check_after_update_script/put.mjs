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

describe('lp: put.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully change the state in the same way after changing the script from lp.ride to lp_stable.ride when executing the put method', async function () {
    const usdnAmount = 1e6;
    const eastAmount = 1e8;
    const shouldAutoStake = false;

    const expectedInAmtAssetAmt = 1e8;
    const expectedInPriceAssetAmt = 1e6;
    const expectedOutLpAmt = 1e8;
    const expectedPrice = 1e8;
    const expectedSlipByUser = 0;
    const expectedSlippageReal = 0;
    const expectedSlipageAmAmt = 0;
    const expectedSlipagePrAmt = 0;
    const expectedPriceLast = 1e8;
    const expectedPriceHistory = 1e8;
    const expectedInvokesCount = 1;

    const lp = address(this.accounts.lp, chainId);

    const putFirst = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.eastAssetId, amount: eastAmount },
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
    await api.transactions.broadcast(putFirst, {});
    await ni.waitForTx(putFirst.id, { apiBase });

    const putSecond = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.eastAssetId, amount: eastAmount },
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
    await api.transactions.broadcast(putSecond, {});
    const {
      height: heightPutSecond,
      stateChanges: stateChangesPutSecond,
      id: idPutSecond,
    } = await ni.waitForTx(putSecond.id, { apiBase });

    const { timestamp: timestampPutSecond } = await api.blocks.fetchHeadersAt(heightPutSecond);
    const keyPriceHistoryPutSecond = `%s%s%d%d__price__history__${heightPutSecond}__${timestampPutSecond}`;

    expect(stateChangesPutSecond.data).to.eql([{
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryPutSecond,
      type: 'integer',
      value: expectedPriceHistory,
    }, {
      key: `%s%s%s__P__${address(this.accounts.user1, chainId)}__${idPutSecond}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__${expectedInAmtAssetAmt}__${expectedInPriceAssetAmt}__${expectedOutLpAmt}__${expectedPrice}__${expectedSlipByUser}__${expectedSlippageReal}__${heightPutSecond}__${timestampPutSecond}__${expectedSlipageAmAmt}__${expectedSlipagePrAmt}`,
    }]);

    expect(stateChangesPutSecond.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.lpAssetId,
      amount: expectedOutLpAmt,
    }]);

    const { invokes: invokesPutSecond } = stateChangesPutSecond;
    expect(invokesPutSecond.length).to.eql(expectedInvokesCount);

    expect(invokesPutSecond[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesPutSecond[0].call.function).to.eql('emit');
    expect(invokesPutSecond[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesPutSecond[0].stateChanges.transfers).to.eql([{
      address: address(this.accounts.lp, chainId),
      asset: this.lpAssetId,
      amount: expectedOutLpAmt,
    }]);
    expect(invokesPutSecond[0].stateChanges.reissues).to.eql([{
      assetId: this.lpAssetId,
      isReissuable: true,
      quantity: expectedOutLpAmt,
    }]);
  });
});
