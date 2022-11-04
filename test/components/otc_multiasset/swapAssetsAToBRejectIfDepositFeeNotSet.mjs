import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import {
  data,
  invokeScript,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

const { waitForTx } = nodeInteraction;

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const api = create(apiBase);
const chainId = 'R';

describe('otc_multiasset: swapAssetsAToBRejectIfDepositFeeNotSet.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject swapAssetsAToB', async function () {
    const amountAssetA = this.minAmountDeposit + 1;

    const expectedRejectMessage = 'otc_multiasset.ride: The deposit fee for this pair of assets is not set.';

    const setKeysTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s__depositFeePermille__${this.assetAId}__${this.assetBId}`,
        value: null,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setKeysTx, {});
    await waitForTx(setKeysTx.id, { apiBase });

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

    await expect(
      api.transactions.broadcast(swapAssetsAToBTx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
    );
  });
});
