import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, libs, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: claimBulkREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claimBulkREADONLY',
    async function () {
      const programName = 'wxlock';
      const programNameSecond = 'wxSpotFee';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const treasuryContractSecond = address(this.accounts.treasurySecond, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const implementationContractSecond = address(this.accounts.implementationSecond, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;
      const referralReward = 1e2;

      const expectedClaimerUnclaimed = referrerReward * 2;
      const expectedClaimerClaimed = 0;

      const bytes = libs.crypto.stringToBytes(
        `${programName}:${referrerAddress}:${referralAddress}`,
      );
      const signature = libs.crypto.signBytes(this.accounts.backend, bytes);

      const bytesSecondProgram = libs.crypto.stringToBytes(
        `${programNameSecond}:${referrerAddress}:${referralAddress}`,
      );
      const signatureSecondProgram = libs.crypto.signBytes(
        this.accounts.backend,
        bytesSecondProgram,
      );

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

      const incUnclaimedTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'incUnclaimed',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: referralAddress },
            { type: 'integer', value: referrerReward },
            { type: 'integer', value: referralReward },
          ],
        },
        chainId,
      }, this.accounts.implementation);
      await api.transactions.broadcast(incUnclaimedTx, {});
      await ni.waitForTx(incUnclaimedTx.id, { apiBase });

      const createReferralProgramTxSecondProgram = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createReferralProgram',
          args: [
            { type: 'string', value: programNameSecond },
            { type: 'string', value: treasuryContractSecond },
            { type: 'string', value: implementationContractSecond },
            { type: 'string', value: this.wxAssetId },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(createReferralProgramTxSecondProgram, {});
      await ni.waitForTx(createReferralProgramTxSecondProgram.id, { apiBase });

      const createPairTxSecondProgram = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'createPair',
          args: [
            { type: 'string', value: programNameSecond },
            { type: 'string', value: referrerAddress },
            { type: 'string', value: referralAddress },
            {
              type: 'binary',
              value: `base64:${libs.crypto.base64Encode(libs.crypto.base58Decode(signatureSecondProgram))}`,
            },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(createPairTxSecondProgram, {});
      await ni.waitForTx(createPairTxSecondProgram.id, { apiBase });

      const incUnclaimedTxSecondProgram = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'incUnclaimed',
          args: [
            { type: 'string', value: programNameSecond },
            { type: 'string', value: referralAddress },
            { type: 'integer', value: referrerReward },
            { type: 'integer', value: referralReward },
          ],
        },
        chainId,
      }, this.accounts.implementationSecond);
      await api.transactions.broadcast(incUnclaimedTxSecondProgram, {});
      await ni.waitForTx(incUnclaimedTxSecondProgram.id, { apiBase });

      const claimBulkTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'claimBulk',
          args: [],
        },
        chainId,
      }, this.accounts.referrerAccount);
      await api.transactions.broadcast(claimBulkTx, {});
      await ni.waitForTx(claimBulkTx.id, { apiBase });

      const expected1 = { type: 'Int', value: expectedClaimerClaimed };
      const expected2 = { type: 'Int', value: expectedClaimerUnclaimed };

      const expr = `claimBulkREADONLY(\"${referrerAddress}\")`; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(referral, expr);
      const checkData = response.result.value._2.value;  /* eslint-disable-line */

      expect(checkData.length).to.eql(2);
      expect(checkData[0]).to.eql(expected1); /* eslint-disable-line */
      expect(checkData[1]).to.eql(expected2); /* eslint-disable-line */
    },
  );
});
