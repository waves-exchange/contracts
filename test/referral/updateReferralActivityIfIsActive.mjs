import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, libs, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: updateReferralActivityIfIsActive.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully updateReferralActivity if isActive is false',
    async function () {
      const programName = 'ReferralProgram';
      const isActive = true;

      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);

      const expectedActiveReferralCount = 1;
      const expectedActiveReferral = true;

      const bytes = libs.crypto.stringToBytes(
        `${programName}:${referrerAddress}:${referralAddress}`,
      );
      const signature = libs.crypto.signBytes(this.accounts.backend, bytes);
      const referral = address(this.accounts.referral, chainId);

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

      const createPairTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createPair',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: referrerAddress },
            { type: 'string', value: referralAddress },
            {
              type: 'binary',
              value: `base64:${libs.crypto.base64Encode(libs.crypto.base58Decode(signature))}`,
            },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(createPairTx, {});
      await ni.waitForTx(createPairTx.id, { apiBase });

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
      }, this.accounts.implementation);
      await api.transactions.broadcast(updateReferralActivityTx, {});
      const { stateChanges } = await ni.waitForTx(updateReferralActivityTx.id, { apiBase });

      expect(
        await checkStateChanges(stateChanges, 2, 0, 0, 0, 0, 0, 0, 0, 0),
      ).to.eql(true);

      expect(stateChanges.data).to.eql([{
        key: `%s%s%s__activeReferral__${programName}__${referralAddress}`,
        type: 'boolean',
        value: expectedActiveReferral,
      }, {
        key: `%s%s%s__activeReferralCount__${programName}__${referrerAddress}`,
        type: 'integer',
        value: expectedActiveReferralCount,
      }]);
    },
  );
});
