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
    const usdnAmount = 1e16 / 10;
    const shibAmount = 1e8 / 10;
    const expectedLpAmount = 1e12;
    const shouldAutoStake = true;
    const priceLast = 1e18;
    const priceHistory = 1e18;

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
      value: priceLast.toString(),
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: priceHistory.toString(),
    }, {
      key: `%s%s%s__P__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__${shibAmount}__${usdnAmount}__${expectedLpAmount}__${priceLast}__0__0__${height}__${timestamp}__0__0`,
    }]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.factoryV2, chainId), 'emit'],
        [address(this.accounts.staking, chainId), 'stake'],
      ]);
  });
});
