import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp: get.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully get. The put method uses the shouldAutoStake argument with a value of false',
    async function () {
      const usdnAmount = 10e6;
      const shibAmount = 10e2;
      const lpAmount = 1e9;
      const shouldAutoStake = false;

      const expectedPriceLast = 1e8;
      const expectedPriceHistory = 1e8;
      const expectedInvokesCount = 1;

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

      const get = invokeScript({
        dApp: lp,
        payment: [
          { assetId: this.lpAssetId, amount: lpAmount },
        ],
        call: {
          function: 'get',
          args: [],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(get, {});
      const { height, stateChanges, id } = await ni.waitForTx(get.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(height);
      const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

      expect(await checkStateChanges(stateChanges, 2, 1, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

      expect(stateChanges.data).to.eql([{
        key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d%d%d__${shibAmount}__${usdnAmount}__${lpAmount}__${expectedPriceLast}__${height}__${timestamp}`,
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

      expect(invokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
      expect(invokes[0].call.function).to.eql('burn');
      expect(invokes[0].call.args).to.eql([
        {
          type: 'Int',
          value: expectedLpAmount,
        }]);
      expect(invokes[0].stateChanges.transfers).to.eql([
        {
          address: address(this.accounts.lp, chainId),
          asset: this.lpAssetId,
          amount: expectedLpAmount,
        }]);
    },
  );
});
