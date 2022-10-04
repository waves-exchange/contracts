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

describe('referral: claimBulk.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claimBulk',
    async function () {
      const programName = 'ReferralProgram';
      const programNameSecond = 'ReferralProgramSecond';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const treasuryContractSecond = address(this.accounts.treasurySecond, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const implementationContractSecond = address(this.accounts.implementationSecond, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;
      const referralReward = 1e2;

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
      const firstIncUnclaimed = await ni.waitForTx(incUnclaimedTx.id, { apiBase });

      expect(firstIncUnclaimed.stateChanges.data).to.eql([{
        key: `%s%s%s%s__unclaimedReferrer__${programName}__${referrerAddress}`,
        type: 'integer',
        value: referrerReward,
      }, {
        key: `%s%s%s%s__unclaimedReferral__${programName}__${referralAddress}`,
        type: 'integer',
        value: referralReward,
      }, {
        key: `%s%s__rewardsTotal__${programName}`,
        type: 'integer',
        value: referrerReward + referralReward,
      }]);

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
      const secondIncUnclaimed = await ni.waitForTx(incUnclaimedTxSecondProgram.id, { apiBase });

      expect(secondIncUnclaimed.stateChanges.data).to.eql([{
        key: `%s%s%s%s__unclaimedReferrer__${programNameSecond}__${referrerAddress}`,
        type: 'integer',
        value: referrerReward,
      }, {
        key: `%s%s%s%s__unclaimedReferral__${programNameSecond}__${referralAddress}`,
        type: 'integer',
        value: referralReward,
      }, {
        key: `%s%s__rewardsTotal__${programNameSecond}`,
        type: 'integer',
        value: referrerReward + referralReward,
      }]);

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
      const { stateChanges } = await ni.waitForTx(claimBulkTx.id, { apiBase });

      const invokeStateChanges = stateChanges.invokes[0].stateChanges;
      const firstTransfer = invokeStateChanges.transfers[0];
      const secondTransfer = invokeStateChanges.invokes[0].stateChanges.transfers[0];

      expect(firstTransfer.amount).to.be.equal(referrerReward);
      expect(secondTransfer.amount).to.be.equal(referrerReward);
    },
  );
});
