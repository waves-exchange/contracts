import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';

import {
  otcMultiassetContract,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: swapAssetsAToBRejectIfNotPayment.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject swapAssetsAToB', async function () {
    const notWaitTx = true;
    const expectedRejectMessage = 'Index 0 out of bounds for length 0';

    const swapAssetsAToBTx = await otcMultiassetContract.swapAssetsAToB(
      address(this.accounts.otcMultiasset, chainId),
      this.accounts.user1,
      this.assetBId,
      [],
      notWaitTx,
    );

    await expect(
      api.transactions.broadcast(swapAssetsAToBTx, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
    );
  });
});
