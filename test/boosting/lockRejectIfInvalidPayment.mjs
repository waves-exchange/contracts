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

describe('boosting: lockRejectIfInvalidPayment.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject lockRef',
    async function () {
      const boosting = address(this.accounts.boosting, chainId);
      const duration = 0;
      const referrer = '';
      const signature = 'base64:';

      const expectedRejectMessage = 'invalid payment - exact one payment must be attached';

      const lockRefTx = invokeScript({
        dApp: boosting,
        payment: [],
        call: {
          function: 'lockRef',
          args: [
            { type: 'integer', value: duration },
            { type: 'string', value: referrer },
            { type: 'string', value: signature },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(lockRefTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
