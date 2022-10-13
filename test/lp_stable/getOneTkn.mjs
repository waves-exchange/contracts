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

describe('lp_stable: getOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully getOneTkn.', async function () {
    const outLp = 1e10;
    const autoStake = false;
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;
    const minOutAmount = 0;
    const delay = 2;
    const expectedPriceLast = 9441800740;
    const expectedPriceHistory = 9441800740;

    const expectedOutAmAmt = 198791435;
    const expectedFee = 99445;
    const expectedOutPrAmt = 0;

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
    const { height } = await ni.waitForTx(putOneTkn.id, { apiBase });

    await ni.waitForHeight(height + delay, { apiBase });

    const getOneTkn = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.lpStableAssetId, amount: outLp },
      ],
      call: {
        function: 'getOneTknV2',
        args: [
          { type: 'string', value: this.usdtAssetId },
          { type: 'integer', value: minOutAmount },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getOneTkn, {});
    const {
      height: heightAfterGetOneTkn,
      stateChanges,
      id,
    } = await ni.waitForTx(getOneTkn.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(heightAfterGetOneTkn);
    const keyPriceHistory = `%s%s%d%d__price__history__${heightAfterGetOneTkn}__${timestamp}`;

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${expectedOutAmAmt}__${expectedOutPrAmt}__${outLp}__${expectedPriceLast}__${heightAfterGetOneTkn}__${timestamp}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.user1, chainId),
        asset: this.usdtAssetId,
        amount: expectedOutAmAmt,
      },
      {
        address: address(this.accounts.feeCollector, chainId),
        asset: this.usdtAssetId,
        amount: expectedFee,
      },
    ]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.factoryV2, chainId), 'burn'],
      ]);
  });
});
