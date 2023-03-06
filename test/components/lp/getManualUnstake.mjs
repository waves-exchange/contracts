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

describe('lp: getManualUnstake.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully get. The put method uses the shouldAutoStake argument with a value of true',
    async function () {
      const usdnAmount = 10e6;
      const shibAmount = 10e2;
      const lpAmount = 1e9 - 1;
      const shouldAutoStake = true;

      const expectedPriceLast = 1e8;
      const expectedPriceHistory = 1e8;
      const expectedInvokesCount = 1;
      const expectedUsdnAmount = usdnAmount - 1;
      const expectedShibAmount = shibAmount - 1;

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

      const unstake = invokeScript({
        dApp: address(this.accounts.staking, chainId),
        call: {
          function: 'unstake',
          args: [
            { type: 'string', value: this.lpAssetId },
            { type: 'integer', value: lpAmount },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(unstake, {});
      await ni.waitForTx(unstake.id, { apiBase });

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

      expect(
        await checkStateChanges(stateChanges, 5, 2, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      expect(stateChanges.data).to.eql([{
        key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d%d%d__${expectedShibAmount}__${expectedUsdnAmount}__${lpAmount}__${expectedPriceLast}__${height}__${timestamp}`,
      }, {
        key: '%s%s__price__last',
        type: 'integer',
        value: expectedPriceLast,
      }, {
        key: keyPriceHistory,
        type: 'integer',
        value: expectedPriceHistory,
      }, {
        key: '%s__kLpRefreshedHeight',
        type: 'integer',
        value: height,
      }, {
        key: '%s__kLp',
        type: 'string',
        value: '100000000000000000000000000000000',
      }]);

      expect(stateChanges.transfers).to.eql([{
        address: address(this.accounts.user1, chainId),
        asset: this.shibAssetId,
        amount: expectedShibAmount,
      }, {
        address: address(this.accounts.user1, chainId),
        asset: this.usdnAssetId,
        amount: expectedUsdnAmount,
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
    },
  );
});
