import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_stable: putOneTknFee.mjs', /** @this {MochaSuiteModified} */() => {
  const feePerMille = 1;
  let usdtAssetId;

  before(async function () {
    usdtAssetId = this.usdtAssetId;

    const setFeePerMilleTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.lpStable),
      data: [{
        key: '%s__feePermille',
        type: 'integer',
        value: feePerMille,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setFeePerMilleTx, {});
    await ni.waitForTx(setFeePerMilleTx.id, { apiBase });
  });

  it('should successfully putOneTkn with autoStake false', async function () {
    const amAssetPart = 1e8;
    const prAssetPart = 1e8;
    const outLp = 1e7;
    const slippage = 1e11;
    const autoStake = false;
    const usdtAmount = 1e10;

    const expectedPriceLast = 90909090;
    const expectedPriceHistory = 90909090;
    const expectedWriteAmAmt = 9990000000;
    const expectedWritePrAmt = 0;
    const expectedEmitLpAmt = 1e10;
    const expectedslippageCalc = 0;
    const expectedAmDiff = 0;
    const expectedPrDiff = 0;
    const expectedFee = (usdtAmount * feePerMille) / 1000;

    const lpStable = address(this.accounts.lpStable, chainId);

    const putOneTkn = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: usdtAssetId, amount: usdtAmount },
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

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.lpStableAssetId,
      amount: outLp,
    }, {
      address: address(this.accounts.matcher, chainId),
      asset: this.usdtAssetId,
      amount: expectedFee,
    }]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.factoryV2, chainId), 'emit'],
      ]);
  });
});
