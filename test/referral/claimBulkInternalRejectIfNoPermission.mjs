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

describe('referral: claimBulkInternalRejectIfNoPermission.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject claimBulkInternal',
    async function () {
      const claimer = '';
      const programNames = '';
      const currentIter = 0;

      const expectedRejectMessage = 'referral.ride: permission denied';

      const claimBulkTx = invokeScript({
        dApp: address(this.accounts.referral, chainId),
        payment: [],
        call: {
          function: 'claimBulkInternal',
          args: [
            { type: 'string', value: claimer },
            { type: 'list', value: [{ type: 'string', value: programNames }] },
            { type: 'integer', value: currentIter },
          ],
        },
        chainId,
      }, this.accounts.referrerAccount);

      await expect(
        api.transactions.broadcast(claimBulkTx, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing dApp:${expectedRejectMessage}$`),
      );
    },
  );
});
