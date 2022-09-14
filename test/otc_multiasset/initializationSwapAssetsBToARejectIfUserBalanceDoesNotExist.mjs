import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import { invokeScript } from '@waves/waves-transactions';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: initializationSwapAssetsBToARejectIfUserBalanceDoesNotExist.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject initializationSwapAssetsBToA', async function () {
    const amountAssetB = this.minAmountDeposit + 1;

    const expectedRejectMessage = 'This user balance does not exist.';

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
