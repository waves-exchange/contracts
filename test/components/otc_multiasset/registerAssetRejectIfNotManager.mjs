import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const api = create(apiBase);
const chainId = 'R';

describe('otc_multiasset: registerAssetRejectIfNotManager.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject registerAsset', async function () {
    const someAccount = this.accounts.otcMultiasset;

    const expectedRejectMessage = 'Transaction is not allowed by account-script';

    const registerAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'registerAsset',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
          { type: 'integer', value: this.withdrawDelay },
          { type: 'integer', value: this.depositFee },
          { type: 'integer', value: this.withdrawFee },
          { type: 'integer', value: this.minAmountDeposit },
          { type: 'integer', value: this.minAmountWithdraw },
          { type: 'integer', value: this.pairStatus },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, someAccount);

    await expect(
      api.transactions.broadcast(registerAssetTx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^${expectedRejectMessage}$`),
    );
  });
});
