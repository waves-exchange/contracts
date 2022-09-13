import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';

import { data, nodeInteraction as ni } from '@waves/waves-transactions';
import {
  otcMultiassetContract,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: swapAssetsAToBRejectIfFeeNegative.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject swapAssetsAToB', async function () {
    const notWaitTx = true;
    const amountAssetA = this.minAmountDeposit + 1;

    const expectedRejectMessage = 'multiasset_otc.ride: Swap amount fail, amount is to small.';

    const setDepositFeePermilleTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s__depositFeePermille__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: 1e8,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setDepositFeePermilleTx, {});
    await ni.waitForTx(setDepositFeePermilleTx.id, { apiBase });

    const swapAssetsAToBTx = await otcMultiassetContract.swapAssetsAToB(
      address(this.accounts.otcMultiasset, chainId),
      this.accounts.user1,
      this.assetBId,
      [{
        assetId: this.assetAId,
        amount: amountAssetA,
      }],
      notWaitTx,
    );

    await expect(
      api.transactions.broadcast(swapAssetsAToBTx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
    );
  });
});
