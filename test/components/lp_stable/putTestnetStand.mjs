import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { transfer, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { flattenInvokes } from './contract/tools.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);
const seed = 'waves private node seed with waves tokens';

describe('lp_stable: putTestnetStand.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully put with shouldAutoStake false in testnet stand', async function () {
    const rest = address(this.accounts.rest, chainId);
    const lpStable = address(this.accounts.lpStable, chainId);
    const userAddress = address(this.accounts.user1, chainId);

    const transferAmountUsdn = 139018444021;
    const transferAmountUsdt = 230660086797;
    const emitAmountLp = 12345678901234;

    const usdnAmount = 5 * 1e8;

    const slippage = 1e8;
    const expectedLpAmount = 44403024994;
    const shouldAutoStake = false;
    const priceLast = 60269830;
    const priceHistory = 60269830;

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

    const expr = `poolEvaluatePutByPriceAssetREADONLY(\"${this.lpStableAssetId}\", ${usdnAmount})`;  /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(rest, expr);
    const splitResponse = response.result.value._2.value.split('__');  /* eslint-disable-line */
    const usdtAmount = parseInt(splitResponse[splitResponse.length - 2], 10);

    const expectedPoolUsdtBalanceAfterPut = transferAmountUsdt + usdtAmount;
    const expectedPoolUsdnBalanceAfterPut = transferAmountUsdn + usdnAmount;
    const userBeforeBalance = await api.assets
      .fetchBalanceAddressAssetId(userAddress, this.lpStableAssetId);

    const put = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
        { assetId: this.usdnAssetId, amount: usdnAmount },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: slippage },
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

    expect(poolUsdnBalanceAfterPut).to.equal(expectedPoolUsdnBalanceAfterPut);
    expect(poolUsdtBalanceAfterPut).to.equal(expectedPoolUsdtBalanceAfterPut);
    expect(parseInt(lpQuantityAfterPut, 10)).to.equal(expectedLpAmount + emitAmountLp);

    const { timestamp } = await api.blocks.fetchHeadersAt(height);
    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;
    const lpStableState = await api.addresses.data(lpStable);
    const userAfterBalance = await api.assets
      .fetchBalanceAddressAssetId(userAddress, this.lpStableAssetId);

    expect(lpStableState).to.include.deep.members([{
      key: '%s%s__price__last',
      type: 'integer',
      value: priceLast,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: priceHistory,
    }, {
      key: `%s%s%s__P__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${expectedLpAmount}__${priceLast}__100000000__100000000__${height}__${timestamp}__0__0`,
    }, {
      key: '%s__dLpRefreshedHeight',
      type: 'integer',
      value: height,
    }, {
      key: '%s__dLp',
      type: 'string',
      value: '29940057202414181477464152049',
    }]);

    expect(Number(userAfterBalance.balance))
      .to.eql(Number(userBeforeBalance.balance) + expectedLpAmount);

    expect(flattenInvokes(stateChanges))
      .to.deep.include.members([
        [address(this.accounts.factoryV2, chainId), 'emit'],
      ]);
  });
});
