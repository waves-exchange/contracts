import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  invokeScript, nodeInteraction,
} from '@waves/waves-transactions';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: initializationSwapAssetsBToA.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully initializationSwapAssetsBToA', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const fee = Math.floor(amountAssetA / 1000) * this.depositFee;
    const amountAssetB = amountAssetA - fee;

    const feeWithdraw = Math.floor(amountAssetB / 1000) * this.withdrawFee;
    const expectedBalance = 0;
    const expectedWithdrawProcessInProgress = amountAssetB - feeWithdraw;
    const expectedtotalFeeCollectedWithdraw = feeWithdraw;

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
    await waitForTx(swapAssetsAToBTx.id, { apiBase });

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
      stateChanges,
    } = await waitForTx(initializationSwapAssetsBToATx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 4, 0, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s%s__assetLockTime__${this.assetAId}__${this.assetBId}__${address(this.accounts.user1, chainId)}`,
      type: 'integer',
      value: height + this.withdrawDelay,
    }, {
      key: `%s%s%s%s__balance__${this.assetAId}__${this.assetBId}__${address(this.accounts.user1, chainId)}`,
      type: 'integer',
      value: expectedBalance,
    }, {
      key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${height + this.withdrawDelay}`,
      type: 'integer',
      value: expectedWithdrawProcessInProgress,
    }, {
      key: `%s%s%s%s__totalFeeCollected__withdraw__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: expectedtotalFeeCollectedWithdraw,
    }]);
  });
});
