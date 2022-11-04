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

describe('lp_stable: putOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully putOneTkn with autoStake true', async function () {
    const minOutAmount = 0;
    const slippage = 0;
    const autoStake = true;
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;

    const expectedPriceLast = 50012503;
    const expectedPriceHistory = 50012503;
    const expectedWriteAmAmt = 1e8;
    const expectedWritePrAmt = 0;
    const expectedEmitLpAmt = 4996564450;
    const expectedslippageCalc = 0;
    const expectedAmDiff = 0;
    const expectedPrDiff = 0;

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
    const { height, stateChanges, id } = await ni.waitForTx(putOneTkn.id, { apiBase });

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
      value: `%d%d%d%d%d%d%d%d%d%d__${expectedWriteAmAmt}__${expectedWritePrAmt}__${expectedEmitLpAmt}__${expectedPriceLast}__${slippage}__${expectedslippageCalc}__${height}__${timestamp}__${expectedAmDiff}__${expectedPrDiff}`,
    }]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.factoryV2, chainId), 'emit'],
        [address(this.accounts.staking, chainId), 'stake'],
      ]);
  });
});
