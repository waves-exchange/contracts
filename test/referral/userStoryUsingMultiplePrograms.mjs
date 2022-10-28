import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, libs, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { waitForHeight } from '../api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: userStoryUsingMultiplePrograms.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully createPair',
    async function () {
      const programName = 'wxlock';
      const programNameWxSpotFee = 'wxSpotFee';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;

      const expectedAllReferralProgramsForReferrerAddress = `${programName}__${programNameWxSpotFee}`;

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
      await ni.waitForTx(createPairTx.id, { apiBase });

      const bytesSecondProgram = libs.crypto.stringToBytes(
        `${programName}:${referrerAddress}:${address(this.accounts.backend, chainId)}`,
      );
      const signatureSecondProgram = libs.crypto.signBytes(
        this.accounts.backend,
        bytesSecondProgram,
      );

      const createPairSecondTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createPair',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: referrerAddress },
            { type: 'string', value: address(this.accounts.backend, chainId) },
            {
              type: 'binary',
              value: `base64:${libs.crypto.base64Encode(libs.crypto.base58Decode(signatureSecondProgram))}`,
            },
          ],
        },
        chainId,
      }, this.accounts.referrerAccount);
      await api.transactions.broadcast(createPairSecondTx, {});
      await ni.waitForTx(createPairSecondTx.id, { apiBase });

      const createReferralProgramNameWxSpotFeeTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createReferralProgram',
          args: [
            { type: 'string', value: programNameWxSpotFee },
            { type: 'string', value: treasuryContract },
            { type: 'string', value: implementationContract },
            { type: 'string', value: this.wxAssetId },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(createReferralProgramNameWxSpotFeeTx, {});
      await ni.waitForTx(createReferralProgramNameWxSpotFeeTx.id, { apiBase });

      const incUnclaimedWithPaymentTx = invokeScript({
        dApp: referral,
        payment: [{ assetId: this.wxAssetId, amount: referrerReward }],
        call: {
          function: 'incUnclaimedWithPayment',
          args: [
            { type: 'string', value: programNameWxSpotFee },
            { type: 'list', value: [{ type: 'string', value: referrerAddress }] },
          ],
        },
        chainId,
      }, this.accounts.implementation);
      await api.transactions.broadcast(incUnclaimedWithPaymentTx, {});
      const { height } = await ni.waitForTx(incUnclaimedWithPaymentTx.id, { apiBase });

      await waitForHeight(height + 4);

      const incUnclaimedWithPaymentSecondTx = invokeScript({
        dApp: referral,
        payment: [{ assetId: this.wxAssetId, amount: referrerReward }],
        call: {
          function: 'incUnclaimedWithPayment',
          args: [
            { type: 'string', value: programNameWxSpotFee },
            { type: 'list', value: [{ type: 'string', value: referrerAddress }] },
          ],
        },
        chainId,
      }, this.accounts.implementation);
      await api.transactions.broadcast(incUnclaimedWithPaymentSecondTx, {});
      await ni.waitForTx(incUnclaimedWithPaymentSecondTx.id, { apiBase });

      const allReferralProgramsForReferrer = await api.addresses.fetchDataKey(
        referral,
        `%s%s__allReferralPrograms__${referrerAddress}`,
      );

      expect(
        expectedAllReferralProgramsForReferrerAddress,
      ).to.be.eql(allReferralProgramsForReferrer.value);
    },
  );
});
