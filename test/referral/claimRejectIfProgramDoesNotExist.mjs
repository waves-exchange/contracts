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

describe('referral: claimRejectIfProgramDoesNotExist.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject claim',
    async function () {
      const ReferralProgramDoesNotExist = 'ReferralProgramDoesNotExist';

      const expectedRejectMessage = 'referral.ride: program does not exist';

      const referral = address(this.accounts.referral, chainId);

      const claimTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: ReferralProgramDoesNotExist },
          ],
        },
        chainId,
      }, this.accounts.referrerAccount);

      await expect(
        api.transactions.broadcast(claimTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
