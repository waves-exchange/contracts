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

describe('lp: putAutoStake.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully put with shouldAutoStake true', async function () {
    const usdnAmount = 10e6;
    const shibAmount = 10e2;
    const shouldAutoStake = true;

    const expectedLpAmount = 1e9;
    const expectedPriceLast = 1e8;
    const expectedPriceHistory = 1e8;
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
    const { height, stateChanges, id } = await ni.waitForTx(put.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);
    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

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
      value: `%d%d%d%d%d%d%d%d%d%d__${shibAmount}__${usdnAmount}__${expectedLpAmount}__${expectedPriceLast}__0__0__${height}__${timestamp}__0__0`,
    }]);

    const { invokes } = stateChanges;
    expect(invokes.length).to.eql(expectedInvokesCount);

    expect(invokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[0].call.function).to.eql('emit');
    expect(invokes[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedLpAmount,
      }]);

    expect(invokes[1].dApp).to.eql(address(this.accounts.staking, chainId));
    expect(invokes[1].call.function).to.eql('stake');
    expect(invokes[1].call.args).to.eql([]);

    expect(invokes[1].payment).to.eql([
      {
        assetId: this.lpAssetId,
        amount: expectedLpAmount,
      }]);
  });
});
