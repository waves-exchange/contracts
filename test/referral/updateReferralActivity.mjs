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

describe('referral: updateReferralActivity.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully updateReferralActivity',
    async function () {
      const programName = '';
      const referralAddress = '';
      const isActive = false;

      const referral = address(this.accounts.referral, chainId);

      const setActiveReferralCountTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'updateReferralActivity',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: referralAddress },
            { type: 'boolean', value: isActive },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setActiveReferralCountTx, {});
      await ni.waitForTx(setActiveReferralCountTx.id, { apiBase });
    },
  );
});
