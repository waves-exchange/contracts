import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  invokeScript, nodeInteraction as ni, nodeInteraction,
} from '@waves/waves-transactions';
import { waitForHeight } from '../api.mjs';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: userStory.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully userStory', async function () {
    const amountAssetAUser1 = this.minAmountDeposit * 3;
    const amountAssetAUser2 = this.minAmountDeposit * 2;

    // user1 makes swap
    // ___________________________________________________________________________________________
    const swapUser1AssetsAToBTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetAId,
        amount: amountAssetAUser1,
      }],
      call: {
        function: 'swapAssetsAToB',
        args: [
          { type: 'string', value: this.assetBId },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(swapUser1AssetsAToBTx, {});
    await waitForTx(swapUser1AssetsAToBTx.id, { apiBase });

    // user2 makes swap
    // ___________________________________________________________________________________________
    const swapUser2AssetsAToBTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetAId,
        amount: amountAssetAUser2,
      }],
      call: {
        function: 'swapAssetsAToB',
        args: [
          { type: 'string', value: this.assetBId },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(swapUser2AssetsAToBTx, {});
    await waitForTx(swapUser2AssetsAToBTx.id, { apiBase });

    // user1 cannot make the init less than the allowed to withdraw
    // ___________________________________________________________________________________________
    let initializationSwapAssetsBToATx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetBId,
        amount: this.minAmountWithdraw - 1,
      }],
      call: {
        function: 'initializationSwapAssetsBToA',
        args: [
          { type: 'string', value: this.assetAId },
        ],
      },
      chainId,
    }, this.accounts.user1);

    const expectedRejectMessage = 'otc_multiasset.ride: The withdraw amount is less than the minimum.';

    await expect(
      api.transactions.broadcast(initializationSwapAssetsBToATx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
    );

    // user1 makes an init in order to withdraw some of his funds
    // ___________________________________________________________________________________________
    const partAmountAssetAUser1 = amountAssetAUser1 / 2;

    initializationSwapAssetsBToATx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetBId,
        amount: partAmountAssetAUser1,
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
    const { height: heightInKey } = await waitForTx(initializationSwapAssetsBToATx.id, { apiBase });

    await waitForHeight(heightInKey + this.withdrawDelay);

    // user1 withdraws part of his funds
    // ___________________________________________________________________________________________
    const feeWithdrawUser1 = Math.floor(partAmountAssetAUser1 / 1000) * this.withdrawFee;

    const expectedPartAmountAssetAUser1MinusFee = (
      partAmountAssetAUser1 - feeWithdrawUser1
    );

    let withdrawAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'withdrawAsset',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
          { type: 'integer', value: heightInKey + this.withdrawDelay },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(withdrawAssetTx, {});
    const { stateChanges } = await ni.waitForTx(withdrawAssetTx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 2, 1, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${heightInKey + this.withdrawDelay}`,
      value: null,
    }, {
      key: `%s%s%s%s%s%d__withdrawProcess__done__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${heightInKey + this.withdrawDelay}`,
      type: 'integer',
      value: expectedPartAmountAssetAUser1MinusFee,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.assetAId,
      amount: expectedPartAmountAssetAUser1MinusFee,
    }]);

    // user1 makes an init in order to withdraw all funds
    // ___________________________________________________________________________________________
    const feeDepositUser1 = Math.floor(amountAssetAUser1 / 1000) * this.depositFee;
    const restOfAmountAssetAUser1 = amountAssetAUser1 - partAmountAssetAUser1 - feeDepositUser1;

    initializationSwapAssetsBToATx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetBId,
        amount: restOfAmountAssetAUser1,
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
      height: secondHeightInKey,
    } = await waitForTx(initializationSwapAssetsBToATx.id, { apiBase });

    await waitForHeight(secondHeightInKey + this.withdrawDelay);

    // user1 takes all
    // ___________________________________________________________________________________________
    const expectedRestAmountAssetAUser1MinusFee = (
      restOfAmountAssetAUser1 - Math.floor(restOfAmountAssetAUser1 / 1000) * this.withdrawFee
    );

    withdrawAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'withdrawAsset',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
          { type: 'integer', value: secondHeightInKey + this.withdrawDelay },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(withdrawAssetTx, {});
    const {
      stateChanges: secondStateChanges,
    } = await ni.waitForTx(withdrawAssetTx.id, { apiBase });

    expect(await checkStateChanges(secondStateChanges, 2, 1, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(secondStateChanges.data).to.eql([{
      key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${secondHeightInKey + this.withdrawDelay}`,
      value: null,
    }, {
      key: `%s%s%s%s%s%d__withdrawProcess__done__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${secondHeightInKey + this.withdrawDelay}`,
      type: 'integer',
      value: expectedRestAmountAssetAUser1MinusFee,
    }]);

    expect(secondStateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.assetAId,
      amount: expectedRestAmountAssetAUser1MinusFee,
    }]);

    const balanceUser1 = await api.addresses.fetchDataKey(
      address(this.accounts.otcMultiasset, chainId),
      `%s%s%s%s__balance__${this.assetAId}__${this.assetBId}__${address(this.accounts.user1, chainId)}`,
    );
    expect(balanceUser1.value).to.eql(0);

    // user2 makes an init in order to withdraw all funds
    // ___________________________________________________________________________________________
    const feeDepositUser2 = Math.floor(amountAssetAUser2 / 1000) * this.depositFee;
    const allAmountAssetAUser2 = amountAssetAUser2 - feeDepositUser2;

    initializationSwapAssetsBToATx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetBId,
        amount: allAmountAssetAUser2,
      }],
      call: {
        function: 'initializationSwapAssetsBToA',
        args: [
          { type: 'string', value: this.assetAId },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(initializationSwapAssetsBToATx, {});
    const {
      height: heightInKeyForUser2,
    } = await waitForTx(initializationSwapAssetsBToATx.id, { apiBase });

    await waitForHeight(heightInKeyForUser2 + this.withdrawDelay);

    // user2 takes all
    // ___________________________________________________________________________________________
    const expectedAmountAssetAUser2MinusFee = (
      allAmountAssetAUser2 - Math.floor(allAmountAssetAUser2 / 1000) * this.withdrawFee
    );

    withdrawAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'withdrawAsset',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
          { type: 'integer', value: heightInKeyForUser2 + this.withdrawDelay },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(withdrawAssetTx, {});
    const {
      stateChanges: firstStateChangesForUser2,
    } = await ni.waitForTx(withdrawAssetTx.id, { apiBase });

    expect(await checkStateChanges(secondStateChanges, 2, 1, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(firstStateChangesForUser2.data).to.eql([{
      key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user2, chainId)}__${this.assetAId}__${this.assetBId}__${heightInKeyForUser2 + this.withdrawDelay}`,
      value: null,
    }, {
      key: `%s%s%s%s%s%d__withdrawProcess__done__${address(this.accounts.user2, chainId)}__${this.assetAId}__${this.assetBId}__${heightInKeyForUser2 + this.withdrawDelay}`,
      type: 'integer',
      value: expectedAmountAssetAUser2MinusFee,
    }]);

    expect(firstStateChangesForUser2.transfers).to.eql([{
      address: address(this.accounts.user2, chainId),
      asset: this.assetAId,
      amount: expectedAmountAssetAUser2MinusFee,
    }]);

    const balanceUser2 = await api.addresses.fetchDataKey(
      address(this.accounts.otcMultiasset, chainId),
      `%s%s%s%s__balance__${this.assetAId}__${this.assetBId}__${address(this.accounts.user2, chainId)}`,
    );
    expect(balanceUser2.value).to.eql(0);

    // manager takes fee
    // ___________________________________________________________________________________________
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

    expect(
      await checkStateChanges(stateChangesWithdrawFee, 2, 2, 0, 0, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(stateChangesWithdrawFee.data).to.eql([{
      key: `%s%s%s%s__totalFeeCollected__deposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: 0,
    }, {
      key: `%s%s%s%s__totalFeeCollected__withdraw__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: 0,
    }]);

    const expectedTotalFeeCollectedDeposit = (
      Math.floor(amountAssetAUser1 / 1000) * this.depositFee
            + Math.floor(amountAssetAUser2 / 1000) * this.depositFee
    );
    const expectedTotalFeeCollectedWithdraw = (
      Math.floor(partAmountAssetAUser1 / 1000) * this.withdrawFee
            + Math.floor(restOfAmountAssetAUser1 / 1000) * this.withdrawFee
            + Math.floor(allAmountAssetAUser2 / 1000) * this.withdrawFee
    );

    expect(stateChangesWithdrawFee.transfers).to.eql([{
      address: address(this.accounts.manager, chainId),
      asset: this.assetAId,
      amount: expectedTotalFeeCollectedWithdraw,
    }, {
      address: address(this.accounts.manager, chainId),
      asset: this.assetBId,
      amount: expectedTotalFeeCollectedDeposit,
    }]);

    const totalFeeCollectedDepositFee = await api.addresses.fetchDataKey(
      address(this.accounts.otcMultiasset, chainId),
      `%s%s%s%s__totalFeeCollected__deposit__${this.assetAId}__${this.assetBId}`,
    );
    expect(totalFeeCollectedDepositFee.value).to.eql(0);

    const totalFeeCollectedWithdrawFee = await api.addresses.fetchDataKey(
      address(this.accounts.otcMultiasset, chainId),
      `%s%s%s%s__totalFeeCollected__withdraw__${this.assetAId}__${this.assetBId}`,
    );
    expect(totalFeeCollectedWithdrawFee.value).to.eql(0);
  });
});
