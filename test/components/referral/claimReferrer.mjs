import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, libs, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: claimReferrer.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claim',
    async function () {
      const programName = 'wxlock';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;
      const referralReward = 1e2;

      const expectedClaimed = 10000;
      const expectedUnclaimed = 0;
      const expectedClaimedTotal = 10000;
      const expectedNewClaimedTotalAddress = 10000;
      const expectedNewUnclaimedTotalAddress = 0;
      const expectedClaimerUnclaimedHistory = 10000;

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

      const claimTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: programName },
          ],
        },
        chainId,
      }, this.accounts.referrerAccount);
      await api.transactions.broadcast(claimTx, {});
      const { height, stateChanges } = await ni.waitForTx(claimTx.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(height);

      expect(
        await checkStateChanges(stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      const invokeClaimInternal = stateChanges.invokes[0];

      expect(invokeClaimInternal.dApp).to.eql(referral);
      expect(invokeClaimInternal.call.function).to.eql('claimInternal');
      expect(invokeClaimInternal.call.args).to.eql([
        { type: 'String', value: 'wxlock' },
        { type: 'String', value: referrerAddress },
        { type: 'Boolean', value: false },
      ]);
      expect(invokeClaimInternal.payment).to.eql([]);
      expect(
        await checkStateChanges(invokeClaimInternal.stateChanges, 6, 1, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      expect(invokeClaimInternal.stateChanges.data).to.eql([{
        key: `%s%s%s__claimedReferrer__${programName}__${referrerAddress}`,
        type: 'integer',
        value: expectedClaimed,
      }, {
        key: `%s%s%s__unclaimedReferrer__${programName}__${referrerAddress}`,
        type: 'integer',
        value: expectedUnclaimed,
      }, {
        key: `%s%s__claimedTotal__${programName}`,
        type: 'integer',
        value: expectedClaimedTotal,
      }, {
        key: `%s%s__claimedTotalAddress__${referrerAddress}`,
        type: 'integer',
        value: expectedNewClaimedTotalAddress,
      }, {
        key: `%s%s__unclaimedTotalAddress__${referrerAddress}`,
        type: 'integer',
        value: expectedNewUnclaimedTotalAddress,
      }, {
        key: `%s%s%s%s%s__history__claimReferrer__${programName}__${referrerAddress}__${claimTx.id}`,
        type: 'string',
        value: `%d%d%d__${height}__${timestamp}__${expectedClaimerUnclaimedHistory}`,
      }]);

      expect(invokeClaimInternal.stateChanges.transfers).to.eql([{
        address: referrerAddress,
        asset: this.wxAssetId,
        amount: expectedClaimed,
      }]);

      const invokeWithdrawReferralReward = invokeClaimInternal.stateChanges.invokes[0];

      expect(invokeWithdrawReferralReward.dApp).to.eql(treasuryContract);
      expect(invokeWithdrawReferralReward.call.function).to.eql('withdrawReferralReward');
      expect(invokeWithdrawReferralReward.call.args).to.eql([
        { type: 'Int', value: expectedClaimed },
      ]);
      expect(invokeWithdrawReferralReward.payment).to.eql([]);
      expect(
        await checkStateChanges(
          invokeWithdrawReferralReward.stateChanges,
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

      expect(invokeWithdrawReferralReward.stateChanges.transfers).to.eql([{
        address: referral,
        asset: this.wxAssetId,
        amount: expectedClaimed,
      }]);
    },
  );
});
