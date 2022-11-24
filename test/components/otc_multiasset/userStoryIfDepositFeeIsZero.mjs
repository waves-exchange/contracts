import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';
import { waitForHeight } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const api = create(apiBase);
const chainId = 'R';

describe('otc_multiasset: userStoryIfDepositFeeIsZero.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully userStoryIfDepositFeeIsZero', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const depositFee = 0;
    const fee = Math.floor(amountAssetA / 1000) * depositFee;
    const amountAssetB = amountAssetA - fee;

    const feeWithdraw = Math.floor(amountAssetB / 1000) * this.withdrawFee;

    const expectedBalance = amountAssetA - fee;
    const expectedTotalCommissionsCollectedDeposit = fee;
    const expectedAmountAssetB = amountAssetA - fee;
    const expectedBalanceAfterInitializationSwapAssetsBToA = 0;
    const expectedWithdrawProcessInProgress = amountAssetB - feeWithdraw;
    const expectedTotalFeeCollectedAfterInitializationSwapAssetsBToA = feeWithdraw + fee;
    const expectedWithdrawProcessDone = expectedWithdrawProcessInProgress;
    const expectedTotalFeeCollectedDeposit = depositFee + feeWithdraw;

    const setKeysTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s__depositFeePermille__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: 0,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setKeysTx, {});
    await ni.waitForTx(setKeysTx.id, { apiBase });

    const swapAssetsAToBTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetAId,
        amount: amountAssetA,
      }],
      call: {
        function: 'swapAssetsAToB',
        args: [
          { type: 'string', value: this.assetBId },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(swapAssetsAToBTx, {});
    const { stateChanges } = await ni.waitForTx(swapAssetsAToBTx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 2, 1, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s%s__balance__${this.assetAId}__${this.assetBId}__${address(this.accounts.user1, chainId)}`,
      type: 'integer',
      value: expectedBalance,
    }, {
      key: `%s%s%s%s__totalFeeCollected__deposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: expectedTotalCommissionsCollectedDeposit,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.assetBId,
      amount: expectedAmountAssetB,
    }]);

    const initializationSwapAssetsBToATx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetBId,
        amount: amountAssetB,
      }],
      call: {
        function: 'initializationSwapAssetsBToA',
        args: [
          { type: 'string', value: this.assetAId },
        ],
      },
      chainId,
    }, this.accounts.user1);

    await api.transactions.broadcast(initializationSwapAssetsBToATx, {});
    const {
      height,
      stateChanges: stateChangesInitializationSwapAssetsBToA,
    } = await ni.waitForTx(initializationSwapAssetsBToATx.id, { apiBase });

    expect(await checkStateChanges(
      stateChangesInitializationSwapAssetsBToA,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    )).to.eql(true);

    expect(stateChangesInitializationSwapAssetsBToA.data).to.eql([{
      key: `%s%s%s%s__balance__${this.assetAId}__${this.assetBId}__${address(this.accounts.user1, chainId)}`,
      type: 'integer',
      value: expectedBalanceAfterInitializationSwapAssetsBToA,
    }, {
      key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${height + this.withdrawDelay}`,
      type: 'integer',
      value: expectedWithdrawProcessInProgress,
    }, {
      key: `%s%s%s%s__totalFeeCollected__deposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: expectedTotalFeeCollectedAfterInitializationSwapAssetsBToA,
    }]);

    await waitForHeight(height + this.withdrawDelay);

    const withdrawAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'withdrawAsset',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
          { type: 'integer', value: height + this.withdrawDelay },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(withdrawAssetTx, {});
    const {
      stateChanges: stateChangesWithdrawAsset,
    } = await ni.waitForTx(withdrawAssetTx.id, { apiBase });

    expect(await checkStateChanges(
      stateChangesWithdrawAsset,
      2,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    )).to.eql(true);

    expect(stateChangesWithdrawAsset.data).to.eql([{
      key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${height + this.withdrawDelay}`,
      value: null,
    }, {
      key: `%s%s%s%s%s%d__withdrawProcess__done__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${height + this.withdrawDelay}`,
      type: 'integer',
      value: expectedWithdrawProcessDone,
    }]);

    expect(stateChangesWithdrawAsset.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.assetAId,
      amount: expectedWithdrawProcessDone,
    }]);

    const withdrawFeeTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'withdrawFee',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
        ],
      },
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(withdrawFeeTx, {});
    const {
      stateChanges: stateChangesWithdrawFee,
    } = await ni.waitForTx(withdrawFeeTx.id, { apiBase });

    expect(await checkStateChanges(
      stateChangesWithdrawFee,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    )).to.eql(true);

    expect(stateChangesWithdrawFee.data).to.eql([{
      key: `%s%s%s%s__totalFeeCollected__deposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: 0,
    }]);

    expect(stateChangesWithdrawFee.transfers).to.eql([{
      address: address(this.accounts.manager, chainId),
      asset: this.assetAId,
      amount: expectedTotalFeeCollectedDeposit,
    }]);
  });
});
