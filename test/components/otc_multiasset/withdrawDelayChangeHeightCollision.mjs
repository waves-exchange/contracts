import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  data, invokeScript, nodeInteraction,
} from '@waves/waves-transactions';
import { waitForHeight } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: withdrawAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it('should be same height error', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const amountAssetB = this.minAmountWithdraw;

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
        value: this.withdrawDelay * 2,
      }],
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
    const { height: heightInKey } = await waitForTx(firstSwapBToATx.id, { apiBase });

    const dataTx2 = data({
      data: [{
        key: `%s%s%s__withdrawDelay__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: this.withdrawDelay,
      }],
      chainId,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
    }, this.accounts.manager);

    await api.transactions.broadcast(dataTx2, {});
    await waitForTx(dataTx2.id, { apiBase });

    await waitForHeight(heightInKey + this.withdrawDelay);

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

    await expect(
      api.transactions.broadcast(secondSwapBToATx, {}),
    ).to.be.rejectedWith('Error while executing dApp: otc_multiasset.ride: '
      + 'At this height, there is already an exchange of this pair.');
  });
});
