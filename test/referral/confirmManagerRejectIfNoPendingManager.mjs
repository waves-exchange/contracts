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

describe('referral: confirmManagerRejectIfNoPendingManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject confirmManager',
    async function () {
      const referral = address(this.accounts.referral, chainId);

      const expectedRejectMessage = 'referral.ride: no pending manager';

      const confirmManagerTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'confirmManager',
          args: [],
        },
        chainId,
      }, this.accounts.implementation);

      await expect(
        api.transactions.broadcast(confirmManagerTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
