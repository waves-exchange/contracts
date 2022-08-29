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

describe('lp_stable: getOneTknFee.mjs', /** @this {MochaSuiteModified} */() => {
  const feePerMille = 1;
  let usdtAssetId;
  let lpStableAssetId;

  before(async function () {
    usdtAssetId = this.usdtAssetId;
    lpStableAssetId = this.lpStableAssetId;

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

  it('should successfully getOneTkn', async function () {
    const amAssetPart = 1e8;
    const prAssetPart = 1e8;
    const outLp = 1e10;
    const slippage = 1e11;
    const autoStake = false;
    const usdtAmount = 100e8;
    const exchResult = 0;
    const notUsed = 0;

    const expectedOutAmAmt = 9990000000;
    const expectedOutPrAmt = 0;
    const expectedFee = (expectedOutAmAmt * feePerMille) / 1000;

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
    await ni.waitForTx(putOneTkn.id, { apiBase });

    const getOneTkn = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: lpStableAssetId, amount: outLp },
      ],
      call: {
        function: 'getOneTkn',
        args: [
          { type: 'integer', value: exchResult },
          { type: 'integer', value: notUsed },
          { type: 'integer', value: usdtAmount },
          { type: 'string', value: usdtAssetId },
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
      amount: expectedOutAmAmt - expectedFee,
    }, {
      address: address(this.accounts.matcher, chainId),
      asset: this.usdtAssetId,
      amount: expectedFee,
    }]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.gwxReward, chainId), 'calcD'],
        [address(this.accounts.factoryV2, chainId), 'burn'],
      ]);
  });
});
