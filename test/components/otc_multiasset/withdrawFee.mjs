import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';
import { waitForHeight } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const api = create(apiBase);
const chainId = 'R';

describe('otc_multiasset: withdrawFee.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject withdrawFee', async function () {
    const amountAssetA = this.minAmountDeposit + 1;
    const feeDeposit = Math.floor(amountAssetA / 1000) * this.depositFee;
    const amountAssetB = amountAssetA - feeDeposit;

    const feeWithdraw = Math.floor(amountAssetB / 1000) * this.withdrawFee;
    const expectedTotalFeeCollectedDeposit = feeDeposit;
    const expectedTotalFeeCollectedWithdraw = feeWithdraw;

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
    await ni.waitForTx(swapAssetsAToBTx.id, { apiBase });

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
      height: heightInKey,
    } = await ni.waitForTx(initializationSwapAssetsBToATx.id, { apiBase });

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
    await api.transactions.broadcast(withdrawAssetTx, {});
    await ni.waitForTx(withdrawAssetTx.id, { apiBase });

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
    const { stateChanges } = await ni.waitForTx(withdrawFeeTx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 2, 2, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s%s__totalFeeCollected__deposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: 0,
    }, {
      key: `%s%s%s%s__totalFeeCollected__withdraw__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: 0,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.manager, chainId),
      asset: this.assetAId,
      amount: expectedTotalFeeCollectedWithdraw,
    }, {
      address: address(this.accounts.manager, chainId),
      asset: this.assetBId,
      amount: expectedTotalFeeCollectedDeposit,
    }]);
  });
});
