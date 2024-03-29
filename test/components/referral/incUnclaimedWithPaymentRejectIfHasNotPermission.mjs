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

describe('referral: incUnclaimedWithPaymentRejectIfHasNotPermission.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject incUnclaimedWithPayment',
    async function () {
      const referral = address(this.accounts.referral, chainId);

      const expectedRejectMessage = 'referral.ride: permission denied';

      const incUnclaimedWithPaymentInternalTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'incUnclaimedWithPaymentInternal',
          args: [
            { type: 'list', value: [{ type: 'string', value: '' }] },
            { type: 'string', value: '' },
            { type: 'list', value: [{ type: 'string', value: '' }] },
            { type: 'string', value: '' },
            { type: 'string', value: '' },
          ],
        },
        chainId,
      }, this.accounts.implementation);

      await expect(
        api.transactions.broadcast(incUnclaimedWithPaymentInternalTx, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
      );
    },
  );
});
