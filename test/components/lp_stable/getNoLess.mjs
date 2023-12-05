import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { flattenInvokesList, flattenTransfers } from './contract/tools.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_stable: getNoLess.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully getNoLess. The put method uses the shouldAutoStake argument with a value of false',
    async function () {
      const usdnAmount = 1e16 / 10;
      const usdtAmount = 1e8 / 10;
      const lpStableAmount = 268990720838218;
      const shouldAutoStake = false;
      const noLessThenAmtAsset = 0;
      const noLessThenPriceAsset = 0;

      const expectedPriceLast = 1e16;
      const expectedPriceHistory = 1e16;

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

      const getNoLess = invokeScript({
        dApp: lpStable,
        payment: [
          { assetId: this.lpStableAssetId, amount: lpStableAmount },
        ],
        call: {
          function: 'getNoLess',
          args: [
            { type: 'integer', value: noLessThenAmtAsset },
            { type: 'integer', value: noLessThenPriceAsset },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(getNoLess, {});
      const { height, stateChanges, id } = await ni.waitForTx(getNoLess.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(height);
      const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;
      const lpStableState = await api.addresses.data(lpStable);

      expect(lpStableState).to.include.deep.members([{
        key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d%d%d__${usdtAmount / 10}__${usdnAmount / 10}__${lpStableAmount}__${expectedPriceLast}__${height}__${timestamp}`,
      }, {
        key: '%s%s__price__last',
        type: 'integer',
        value: expectedPriceLast.toString(),
      }, {
        key: keyPriceHistory,
        type: 'integer',
        value: expectedPriceHistory.toString(),
      }, {
        key: '%s__dLpRefreshedHeight',
        type: 'integer',
        value: height,
      }, {
        key: '%s__dLp',
        type: 'string',
        value: '10000000000000006424805538327',
      }]);

      expect(flattenTransfers(stateChanges)).to.eql([{
        address: address(this.accounts.user1, chainId),
        asset: this.usdtAssetId,
        amount: usdtAmount / 10,
      }, {
        address: address(this.accounts.user1, chainId),
        asset: this.usdnAssetId,
        amount: (usdnAmount / 10).toString(),
      }]);

      expect(flattenInvokesList(stateChanges))
        .to.deep.include.members([
          [address(this.accounts.factoryV2, chainId), 'burn'],
        ]);
    },
  );
});
