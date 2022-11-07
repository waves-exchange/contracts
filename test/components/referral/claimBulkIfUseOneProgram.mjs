import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, libs, nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: claimBulkIfUseOneProgram.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claimBulk',
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
      const {
        id,
        height: heightClaimBulk,
        stateChanges,
      } = await ni.waitForTx(claimBulkTx.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(heightClaimBulk);

      // claimBulk invoke
      // ___________________________________________________________________________________________

      expect(
        await checkStateChanges(stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      const { invokes } = stateChanges;

      // firstClaimBulk
      // ___________________________________________________________________________________________
      const firstClaimBulk = invokes[0];
      expect(
        await checkStateChanges(firstClaimBulk.stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 2),
      ).to.eql(true);

      expect(firstClaimBulk.dApp).to.eql(address(this.accounts.referral, chainId));
      expect(firstClaimBulk.call.function).to.eql('claimBulkInternal');
      expect(firstClaimBulk.call.args).to.eql([
        {
          type: 'String',
          value: referrerAddress,
        }, {
          type: 'Array',
          value: [
            { type: 'String', value: programName },
            { type: 'String', value: programNameSecond },
          ],
        }, {
          type: 'Int',
          value: 0,
        }]);
      expect(firstClaimBulk.payment).to.eql([]);

      // secondClaimBulk, claimInternal
      // ___________________________________________________________________________________________
      const secondClaimBulk = firstClaimBulk.stateChanges.invokes[0];
      const claimInternalAfterFirstClaimBulk = firstClaimBulk.stateChanges.invokes[1];

      expect(
        await checkStateChanges(
          secondClaimBulk.stateChanges,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
        ),
      ).to.eql(true);

      expect(secondClaimBulk.dApp).to.eql(address(this.accounts.referral, chainId));
      expect(secondClaimBulk.call.function).to.eql('claimBulkInternal');
      expect(secondClaimBulk.call.args).to.eql([
        {
          type: 'String',
          value: referrerAddress,
        }, {
          type: 'Array',
          value: [
            { type: 'String', value: programName },
            { type: 'String', value: programNameSecond },
          ],
        }, {
          type: 'Int',
          value: 1,
        }]);
      expect(secondClaimBulk.payment).to.eql([]);

      expect(
        await checkStateChanges(
          claimInternalAfterFirstClaimBulk.stateChanges,
          6,
          1,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
        ),
      ).to.eql(true);

      expect(claimInternalAfterFirstClaimBulk.stateChanges.data).to.eql([{
        key: `%s%s%s__claimedReferrer__${programName}__${referrerAddress}`,
        type: 'integer',
        value: referrerReward,
      }, {
        key: `%s%s%s__unclaimedReferrer__${programName}__${referrerAddress}`,
        type: 'integer',
        value: 0,
      }, {
        key: `%s%s__claimedTotal__${programName}`,
        type: 'integer',
        value: referrerReward,
      }, {
        key: `%s%s__claimedTotalAddress__${referrerAddress}`,
        type: 'integer',
        value: referrerReward,
      }, {
        key: `%s%s__unclaimedTotalAddress__${referrerAddress}`,
        type: 'integer',
        value: 0,
      }, {
        key: `%s%s%s%s%s__history__claimReferrer__${programName}__${referrerAddress}__${id}`,
        type: 'string',
        value: `%d%d%d__${heightClaimBulk}__${timestamp}__${referrerReward}`,
      }]);

      expect(claimInternalAfterFirstClaimBulk.stateChanges.transfers).to.eql([{
        address: referrerAddress,
        asset: this.wxAssetId,
        amount: referrerReward,
      }]);

      const withdrawReferralRewardAfterFirstClaimBulk = claimInternalAfterFirstClaimBulk
        .stateChanges.invokes[0];
      expect(
        await checkStateChanges(
          withdrawReferralRewardAfterFirstClaimBulk.stateChanges,
          0,
          1,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ),
      ).to.eql(true);

      expect(
        await checkStateChanges(
          secondClaimBulk.stateChanges.invokes[0].stateChanges,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ),
      ).to.eql(true);
    },
  );
});
