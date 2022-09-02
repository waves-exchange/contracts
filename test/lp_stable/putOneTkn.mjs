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
  it('should successfully putOneTkn with autoStake false', async function () {
    const amAssetPart = 1e8;
    const prAssetPart = 1e8;
    const outLp = 1e10;
    const slipByUser = 1e3;
    const autoStake = false;
    const usdtAmount = 1e8;

    const expectedPrice = 1e8;
    const expectedPriceHistory = 1e8;
    const expectedInAmtAssetAmt = 1e8;
    const expectedInPriceAssetAmt = 0;
    const expectedOutLpAmt = 1e10;
    const expectedSlippageReal = 0;
    const expectedSlipageAmAmt = 0;
    const expectedSlipagePrAmt = 0;

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
          { type: 'integer', value: slipByUser },
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
      value: expectedPrice,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistory,
    }, {
      key: `%s%s%s__P__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__${expectedInAmtAssetAmt}__${expectedInPriceAssetAmt}__${expectedOutLpAmt}__${expectedPrice}__${slipByUser}__${expectedSlippageReal}__${height}__${timestamp}__${expectedSlipageAmAmt}__${expectedSlipagePrAmt}`,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.lpStableAssetId,
      amount: outLp,
    }]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.factoryV2, chainId), 'emit'],
      ]);
  });
});
