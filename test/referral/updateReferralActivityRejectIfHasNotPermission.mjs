import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: updateReferralActivityRejectIfHasNotPermission.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject updateReferralActivity',
    async function () {
      const programName = 'wxlock';
      const isActive = false;
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const notImplementationAccount = this.accounts.treasury;
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referral = address(this.accounts.referral, chainId);

      const expectedRejectMessage = 'referral.ride: permission denied';

      const createReferralProgramTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createReferralProgram',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: treasuryContract },
            { type: 'string', value: implementationContract },
            { type: 'string', value: this.wxAssetId },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(createReferralProgramTx, {});
      await ni.waitForTx(createReferralProgramTx.id, { apiBase });

      const updateReferralActivityTx = invokeScript({
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
      }, notImplementationAccount);

      await expect(api.transactions.broadcast(updateReferralActivityTx, {})).to.be.rejectedWith(
        new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
      );
    },
  );
});
