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

describe('referral: claimREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claimREADONLY',
    async function () {
      const programName = '';
      const referralAddress = '';

      const referral = address(this.accounts.referral, chainId);

      const claimREADONLYTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'claimREADONLY',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: referralAddress },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(claimREADONLYTx, {});
      await ni.waitForTx(claimREADONLYTx.id, { apiBase });
    },
  );
});
