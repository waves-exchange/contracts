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
    const amAssetPart = 1e8;
    const prAssetPart = 1e8;
    const outLp = 1e10;
    const slippage = 1e3;
    const autoStake = false;
    const usdtAmount = 1e8;
    const exchResult = 0;
    const notUsed = 0;
    const delay = 2;

    const expectedOutAmAmt = 1e8;
    const expectedOutPrAmt = 0;

    const lpStable = address(this.accounts.lpStable, chainId);

    const putOneTkn = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
      ],
      call: {
        function: 'putOneTkn',
        args: [
          { type: 'integer', value: amAssetPart },
          { type: 'integer', value: prAssetPart },
          { type: 'integer', value: outLp },
          { type: 'integer', value: slippage },
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
        function: 'getOneTkn',
        args: [
          { type: 'integer', value: exchResult },
          { type: 'integer', value: notUsed },
          { type: 'integer', value: usdtAmount },
          { type: 'string', value: this.usdtAssetId },
          { type: 'integer', value: slippage },
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
      value: `%d%d%d%d%d%d__${expectedOutAmAmt}__${expectedOutPrAmt}__${outLp}__0__${heightAfterGetOneTkn}__${timestamp}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: 0,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: 0,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.factoryV2, chainId), 'burn'],
      ]);
  });
});
