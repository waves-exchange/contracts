import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { transfer, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);
const seed = 'waves private node seed with waves tokens';

describe('lp_stable: putTestnetStand.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully put with shouldAutoStake false in testnet stand', async function () {
    const transferAmountUsdn = 292756942463;
    const transferAmountUsdt = 7730464966;
    const emitAmountLp = 55966140078702;

    const usdnAmount = 1e16 / 10;
    const usdtAmount = 1e8 / 10;
    const expectedLpAmount = 1e13;
    const shouldAutoStake = false;
    const priceLast = 1e16;
    const priceHistory = 1e16;

    const lpStable = address(this.accounts.lpStable, chainId);

    const usdnTransferTx = transfer({
      amount: transferAmountUsdn,
      recipient: lpStable,
      assetId: this.usdnAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(usdnTransferTx, {});
    await ni.waitForTx(usdnTransferTx.id, { apiBase });

    const usdtTransferTx = transfer({
      amount: transferAmountUsdt,
      recipient: lpStable,
      assetId: this.usdtAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(usdtTransferTx, {});
    await ni.waitForTx(usdtTransferTx.id, { apiBase });

    const emitFactoryV2InvokeTx = invokeScript({
      dApp: address(this.accounts.factoryV2, chainId),
      additionalFee: 4e5,
      call: {
        function: 'emit',
        args: [
          { type: 'integer', value: emitAmountLp },
        ],
      },
      senderPublicKey: publicKey(this.accounts.lpStable),
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(emitFactoryV2InvokeTx, {});
    await ni.waitForTx(emitFactoryV2InvokeTx.id, { apiBase });

    const poolUsdnBalance = (
      await api.assets.fetchBalanceAddressAssetId(
        lpStable,
        this.usdnAssetId,
      )
    ).balance;
    const poolUsdtBalance = (
      await api.assets.fetchBalanceAddressAssetId(
        lpStable,
        this.usdtAssetId,
      )
    ).balance;
    const lpQuantity = (await api.assets.fetchAssetsDetails([this.lpStableAssetId]))[0].quantity;

    expect(poolUsdnBalance).to.equal(transferAmountUsdn);
    expect(poolUsdtBalance).to.equal(transferAmountUsdt);
    expect(parseInt(lpQuantity, 10)).to.equal(emitAmountLp);

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
    const { height, stateChanges, id } = await ni.waitForTx(put.id, { apiBase });

    const poolUsdnBalanceAfterPut = (
      await api.assets.fetchBalanceAddressAssetId(
        lpStable,
        this.usdnAssetId,
      )
    ).balance;
    const poolUsdtBalanceAfterPut = (
      await api.assets.fetchBalanceAddressAssetId(
        lpStable,
        this.usdtAssetId,
      )
    ).balance;
    const lpQuantityAfterPut = (
      await api.assets.fetchAssetsDetails(
        [this.lpStableAssetId],
      )
    )[0].quantity;

    expect(poolUsdnBalanceAfterPut).to.equal(transferAmountUsdn);
    expect(poolUsdtBalanceAfterPut).to.equal(transferAmountUsdt);
    expect(parseInt(lpQuantityAfterPut, 10)).to.equal(emitAmountLp);

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
      value: `%d%d%d%d%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${expectedLpAmount}__${priceLast}__0__0__${height}__${timestamp}__0__0`,
    }, {
      key: '%s__dLpRefreshedHeight',
      type: 'integer',
      value: height,
    }, {
      key: '%s__dLp',
      type: 'string',
      value: 0,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.lpStableAssetId,
      amount: expectedLpAmount.toString(),
    }]);

    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.factoryV2, chainId), 'emit'],
      ]);
  });
});
