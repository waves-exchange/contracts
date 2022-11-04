import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: claimWxBoostRejectIfCallerIsNotStakingContract.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject claimWxBoost',
    async function () {
      const lpAssetIdStr = '';
      const userAddressStr = '';

      const expectedRejectMessage = 'permissions denied';

      const claimWxBoostTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [],
        call: {
          function: 'claimWxBoost',
          args: [
            { type: 'string', value: lpAssetIdStr },
            { type: 'string', value: userAddressStr },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(claimWxBoostTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: ${expectedRejectMessage}`,
      );
    },
  );
});
