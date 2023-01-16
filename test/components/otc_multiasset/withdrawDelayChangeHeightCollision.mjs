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
const addedDelay = 2;

const api = create(apiBase);

describe('otc_multiasset: withdrawDelayChangeHeightCollision.mjs', /** @this {MochaSuiteModified} */() => {
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

    const increaseDelyaDataTx = data({
      data: [{
        key: `%s%s%s__withdrawDelay__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: this.withdrawDelay + addedDelay,
      }],
      chainId,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
    }, this.accounts.manager);

    await api.transactions.broadcast(increaseDelyaDataTx, {});
    await waitForTx(increaseDelyaDataTx.id, { apiBase });

    const firstInitSwapBToATx = invokeScript({
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

    await api.transactions.broadcast(firstInitSwapBToATx, {});
    const { height: heightInKey } = await waitForTx(firstInitSwapBToATx.id, { apiBase });

    const decreaseDelayDataTx = data({
      data: [{
        key: `%s%s%s__withdrawDelay__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: this.withdrawDelay,
      }],
      chainId,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
    }, this.accounts.manager);

    await api.transactions.broadcast(decreaseDelayDataTx, {});
    await waitForTx(decreaseDelayDataTx.id, { apiBase });

    const secondInitSwapBToATx = invokeScript({
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

    await waitForHeight(heightInKey + addedDelay);
    await expect(
      api.transactions.broadcast(secondInitSwapBToATx, {}),
    ).to.be.rejectedWith('Error while executing dApp: otc_multiasset.ride: '
      + 'At this height, there is already an exchange of this pair.');
  });
});
