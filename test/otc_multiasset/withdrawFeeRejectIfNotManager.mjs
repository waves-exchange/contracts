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

describe('otc_multiasset: withdrawFeeRejectIfNotManager.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject withdrawFee', async function () {
    const someAccount = this.accounts.otcMultiasset;

    const expectedRejectMessage = 'Transaction is not allowed by account-script';

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
    }, someAccount);

    await expect(
      api.transactions.broadcast(withdrawFeeTx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^${expectedRejectMessage}$`),
    );
  });
});
