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

describe('referral: createPairRejectIfProgramDoesNotExist.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject createPair',
    async function () {
      const DoesNotExitProgramName = 'ReferralProgram';
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);

      const expectedRejectMessage = 'referral.ride: program does not exist';

      const referral = address(this.accounts.referral, chainId);

      const createPairTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createPair',
          args: [
            { type: 'string', value: DoesNotExitProgramName },
            { type: 'string', value: referrerAddress },
            { type: 'string', value: referralAddress },
            {
              type: 'binary', value: '',
            },
          ],
        },
        chainId,
      }, this.accounts.manager);

      await expect(
        api.transactions.broadcast(createPairTx, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
      );
    },
  );
});
