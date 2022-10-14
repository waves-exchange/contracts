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

describe('referral: claimBulkRejectIfNoReferalPrograms.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject claimBulk',
    async function () {
      const referral = address(this.accounts.referral, chainId);
      const expectedRejectMessage = 'referral.ride: no referral programs';

      const claimBulkTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'claimBulk',
          args: [],
        },
        chainId,
      }, this.accounts.referrerAccount);

      await expect(
        api.transactions.broadcast(claimBulkTx, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
      );
    },
  );
});
