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

describe('referral: incUnclaimed.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully incUnclaimed',
    async function () {
      const programName = '';
      const referralAddress = '';
      const referrerReward = '';
      const referralReward = '';

      const referral = address(this.accounts.referral, chainId);

      const setIncUnclaimedTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'incUnclaimed',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: referralAddress },
            { type: 'string', value: referrerReward },
            { type: 'string', value: referralReward },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setIncUnclaimedTx, {});
      await ni.waitForTx(setIncUnclaimedTx.id, { apiBase });
    },
  );
});
