import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  data, invokeScript, nodeInteraction,
} from '@waves/waves-transactions';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: swapAssetsAToBRejectIfDepositBlocked.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject swapAssetsAToB', async function () {
    const amountAssetA = 1;

    const expectedRejectMessage = 'multiasset_otc.ride: The couple\'s deposit is blocked.';

    const setAssetsPairStatusTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s__assetsPairStatus__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: 1,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setAssetsPairStatusTx, {});
    await waitForTx(setAssetsPairStatusTx.id, { apiBase });

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
      new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
    );
  });
});
