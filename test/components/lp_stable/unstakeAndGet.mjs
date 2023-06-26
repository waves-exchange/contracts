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

describe('lp_stable: unstakeAndGet.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully unstakeAndGet. The put method uses the shouldAutoStake argument with a value of true',
    async function () {
      const usdnAmount = 1e16 / 10;
      const usdtAmount = 1e8 / 10;
      const lpStableAmount = 2689907208382172;
      const shouldAutoStake = true;
      const priceLast = 1e16;
      const priceHistory = 1e16;

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
            { type: 'boolean', value: shouldAutoStake },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(put, {});
      await ni.waitForTx(put.id, { apiBase });

      const unstakeAndGet = invokeScript({
        dApp: lpStable,
        call: {
          function: 'unstakeAndGet',
          args: [
            { type: 'integer', value: lpStableAmount },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(unstakeAndGet, {});
      const { height, stateChanges, id } = await ni.waitForTx(unstakeAndGet.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(height);
      const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

      expect(stateChanges.data).to.eql([{
        key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${lpStableAmount}__${priceLast}__${height}__${timestamp}`,
      }, {
        key: '%s%s__price__last',
        type: 'integer',
        value: priceLast.toString(),
      }, {
        key: keyPriceHistory,
        type: 'integer',
        value: priceHistory.toString(),
      }, {
        key: '%s__dLpRefreshedHeight',
        type: 'integer',
        value: height,
      }, {
        key: '%s__dLp',
        type: 'string',
        value: '0',
      }]);

      expect(stateChanges.transfers).to.eql([{
        address: address(this.accounts.user1, chainId),
        asset: this.usdtAssetId,
        amount: usdtAmount,
      }, {
        address: address(this.accounts.user1, chainId),
        asset: this.usdnAssetId,
        amount: (usdnAmount).toString(),
      }]);

      expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
        .to.deep.include.members([
          [address(this.accounts.factoryV2, chainId), 'burn'],
        ]);
    },
  );
});
