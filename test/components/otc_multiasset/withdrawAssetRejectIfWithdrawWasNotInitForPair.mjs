import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  data,
  invokeScript, nodeInteraction,
} from '@waves/waves-transactions';
import { waitForHeight } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: withdrawAssetRejectIfWithdrawWasNotInitForPair.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject withdrawAsset', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const fee = Math.floor(amountAssetA / 1000) * this.depositFee;
    const amountAssetB = amountAssetA - fee;

    const expectedRejectMessage = 'otc_multiasset.ride: '
            + 'At this height, withdraw was not initialized with this pair of assets.';

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

    const setKeysTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s%s%s%d__withdrawProcess__inProgress__${address(this.accounts.user1, chainId)}__${this.assetAId}__${this.assetBId}__${heightInKey + this.withdrawDelay}`,
        value: null,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setKeysTx, {});
    await waitForTx(setKeysTx.id, { apiBase });

    await waitForHeight(heightInKey + this.withdrawDelay);

    const withdrawAssetTx = invokeScript({
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

    await expect(
      api.transactions.broadcast(withdrawAssetTx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
    );
  });
});
