import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
// const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: claim.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claim',
    async function () {
      const programName = '';

      const referral = address(this.accounts.referral, chainId);

      const claimTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: programName },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(claimTx, {});
      await ni.waitForTx(claimTx.id, { apiBase });
    },
  );
});
