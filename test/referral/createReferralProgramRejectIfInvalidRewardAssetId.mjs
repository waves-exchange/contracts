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

describe('referral: createReferralProgramRejectIfInvalidRewardAssetId.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject createReferralProgram',
    async function () {
      const programName = 'wxlock';
      const invalidWxAssetId = this.wxAssetId.slice(0, this.wxAssetId.length - 1);
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referral = address(this.accounts.referral, chainId);

      const expectedRejectMessage = 'referral.ride: invalid reward asset id';

      const createReferralProgramTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createReferralProgram',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: treasuryContract },
            { type: 'string', value: implementationContract },
            { type: 'string', value: invalidWxAssetId },
          ],
        },
        chainId,
      }, this.accounts.manager);

      await expect(
        api.transactions.broadcast(createReferralProgramTx, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
      );
    },
  );
});
