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

describe('referral: createPair.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully createPair',
    async function () {
      const programName = 'ReferralProgram';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);

      const expectedTotalReferralCount = 1;

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
      }, this.accounts.referrerAccount);
      await api.transactions.broadcast(createPairTx, {});
      const { stateChanges } = await ni.waitForTx(createPairTx.id, { apiBase });

      expect(
        await checkStateChanges(stateChanges, 5, 0, 0, 0, 0, 0, 0, 0, 0),
      ).to.eql(true);

      expect(stateChanges.data).to.eql([{
        key: `%s%s%s%s__existsReferrerToReferral__${programName}__${referrerAddress}__${referralAddress}`,
        type: 'boolean',
        value: true,
      }, {
        key: `%s%s%s__totalReferralCount__${programName}__${referrerAddress}`,
        type: 'integer',
        value: expectedTotalReferralCount,
      }, {
        key: `%s%s%s__referrer__${programName}__${referralAddress}`,
        type: 'string',
        value: referrerAddress,
      }, {
        key: `%s%s__allReferralPrograms__${referrerAddress}`,
        type: 'string',
        value: programName,
      }, {
        key: `%s%s__allReferralPrograms__${referralAddress}`,
        type: 'string',
        value: programName,
      },
      ]);
    },
  );
});
