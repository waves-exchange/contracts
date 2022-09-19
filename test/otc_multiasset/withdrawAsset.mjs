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

describe('otc_multiasset: withdrawAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully withdrawAsset', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const fee = Math.floor(amountAssetA / 1000) * this.depositFee;
    const amountAssetB = amountAssetA - fee;

    const feeWithdraw = Math.floor(amountAssetB / 1000) * this.withdrawFee;
    const expectedWithdrawProcessDone = amountAssetB - feeWithdraw;

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
    const { height: heightInKey } = await waitForTx(initializationSwapAssetsBToATx.id, { apiBase });

    await waitForHeight(heightInKey + this.withdrawDelay);

    const withdrawAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetBId,
        amount: amountAssetB,
      }],
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
      value: expectedWithdrawProcessDone,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.assetAId,
      amount: expectedWithdrawProcessDone,
    }]);
  });
});
