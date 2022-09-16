import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  data, invokeScript, nodeInteraction,
} from '@waves/waves-transactions';
import { waitForHeight } from '../api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: initializationSwapAssetsBToARejectIfAlreadyExchangeThisPair.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject initializationSwapAssetsBToA', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const amountAssetB = this.minAmountWithdraw + 1;

    const expectedRejectMessage = 'otc_multiasset.ride: '
      + 'At this height, there is already an exchange of this pair.';

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
    const { height } = await waitForTx(swapAssetsAToBTx.id, { apiBase });

    const delay = height + 2;

    const setKeysTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s%s__assetLockTime__${this.assetAId}__${this.assetBId}__${address(this.accounts.user1, chainId)}`,
        type: 'integer',
        value: delay + this.withdrawDelay,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setKeysTx, {});
    await waitForTx(setKeysTx.id, { apiBase });

    await waitForHeight(delay);

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

    await expect(
      api.transactions.broadcast(initializationSwapAssetsBToATx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
    );
  });
});
