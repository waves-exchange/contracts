import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
  data, invokeScript, issue, massTransfer, nodeInteraction,
} from '@waves/waves-transactions';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: swapAssetsAToBRejectIfAssetPairNotExist.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject swapAssetsAToB', async function () {
    const amountSomeAsset = 1;

    const expectedRejectMessage = 'This asset pair does not exist.';

    const someAssetIssueTx = issue({
      name: 'someAsset',
      description: '',
      quantity: 100000e6,
      decimals: 6,
      chainId,
    }, seed);
    await api.transactions.broadcast(someAssetIssueTx, {});
    await waitForTx(someAssetIssueTx.id, { apiBase });
    const someAssetId = someAssetIssueTx.id;

    const someAssetAmount = 100e6;
    const massTransferAssetATx = massTransfer({
      transfers: [{
        recipient: address(this.accounts.user1, chainId), amount: someAssetAmount,
      }],
      assetId: someAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferAssetATx, {});
    await waitForTx(massTransferAssetATx.id, { apiBase });

    const setAssetsPairStatusTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s__assetsPairStatus__${someAssetId}__${this.assetBId}`,
        type: 'integer',
        value: 0,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setAssetsPairStatusTx, {});
    await waitForTx(setAssetsPairStatusTx.id, { apiBase });

    const swapAssetsAToBTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: someAssetId,
        amount: amountSomeAsset,
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
