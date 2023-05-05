import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  data, invokeScript, nodeInteraction as ni, nodeInteraction,
} from '@waves/waves-transactions';
import { waitForHeight } from '../../utils/api.mjs';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: withdrawDelayChange.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully withdrawAsset after delay change', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const amountAssetB = this.minAmountWithdraw;

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

    const dataTx1 = data({
      data: [{
        key: `%s%s%s__withdrawDelay__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: 100,
      }],
      additionalFee: 4e5,
      chainId,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
    }, this.accounts.manager);

    await api.transactions.broadcast(dataTx1, {});
    await waitForTx(dataTx1.id, { apiBase });

    const firstSwapBToATx = invokeScript({
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

    await api.transactions.broadcast(firstSwapBToATx, {});
    await waitForTx(firstSwapBToATx.id, { apiBase });

    const dataTx2 = data({
      data: [{
        key: `%s%s%s__withdrawDelay__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: this.withdrawDelay,
      }],
      additionalFee: 4e5,
      chainId,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
    }, this.accounts.manager);

    await api.transactions.broadcast(dataTx2, {});
    await waitForTx(dataTx2.id, { apiBase });

    const secondSwapBToATx = invokeScript({
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

    await api.transactions.broadcast(secondSwapBToATx, {});
    const { height: heightKey } = await waitForTx(secondSwapBToATx.id, { apiBase });

    await waitForHeight(heightKey + this.withdrawDelay);

    const withdrawAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'withdrawAsset',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
          { type: 'integer', value: heightKey + this.withdrawDelay },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(withdrawAssetTx, {});
    const { stateChanges } = await ni.waitForTx(withdrawAssetTx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 2, 1, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${heightKey + this.withdrawDelay}`,
      value: null,
    }, {
      key: `%s%s%s%s%s%d__withdrawProcess__done__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${heightKey + this.withdrawDelay}`,
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
