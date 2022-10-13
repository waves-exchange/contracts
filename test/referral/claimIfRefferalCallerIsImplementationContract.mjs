import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  data, invokeScript, libs, nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { checkStateChanges, setScriptFromFile } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

const mockRidePath = join('test', 'referral', 'mock');
const implementationPath = format({ dir: mockRidePath, base: 'implementation.mock.ride' });

describe('referral: claimIfRefferalCallerIsImplementationContract.mjs', /** @this {MochaSuiteModified} */() => {
  const programName = 'ReferralProgram';
  const referralReward = 1e2;
  before(async function () {
    await setScriptFromFile(implementationPath, this.accounts.implementation);

    const setKeysTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'assetId',
          type: 'string',
          value: this.wxAssetId,
        }, {
          key: 'amount',
          type: 'integer',
          value: referralReward,
        }, {
          key: 'programName',
          type: 'string',
          value: programName,
        }, {
          key: 'referralAddress',
          type: 'string',
          value: address(this.accounts.referral, chainId),
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setKeysTx, {});
    await ni.waitForTx(setKeysTx.id, { apiBase });
  });

  it(
    'should successfully claim',
    async function () {
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;

      const expectedNewClaimerClaimed = 100;
      const expectedNewClaimedTotal = 100;
      const expectedUnclaimed = 0;
      const expectedNewClaimedTotalAddress = 100;
      const expectedNewUnclaimedTotalAddress = 0;
      const expectedClaimerUnclaimed = 100;
      const expectedClaimerUnclaimedHistory = 100;

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
        dApp: address(this.accounts.implementation, chainId),
        payment: [],
        call: {
          function: 'claimReward',
          args: [],
        },
        chainId,
      }, this.accounts.referralAccount);
      await api.transactions.broadcast(claimTx, {});
      const { height, stateChanges } = await ni.waitForTx(claimTx.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(height);

      expect(
        await checkStateChanges(stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      const { invokes } = stateChanges;
      expect(
        await checkStateChanges(invokes[0].stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);
      const invokeClaim = invokes[0];

      expect(invokeClaim.dApp).to.eql(referral);
      expect(invokeClaim.call.function).to.eql('claim');
      expect(invokeClaim.call.args).to.eql([{
        type: 'String',
        value: 'ReferralProgram',
      }]);
      expect(invokeClaim.payment).to.eql([]);
      expect(
        await checkStateChanges(invokeClaim.stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      const invokeClaimInternal = invokeClaim.stateChanges.invokes[0];

      expect(invokeClaimInternal.dApp).to.eql(referral);
      expect(invokeClaimInternal.call.function).to.eql('claimInternal');
      expect(invokeClaimInternal.call.args).to.eql([
        { type: 'String', value: 'ReferralProgram' },
        { type: 'String', value: referralAddress },
        { type: 'Boolean', value: true },
      ]);
      expect(invokeClaimInternal.payment).to.eql([]);
      expect(
        await checkStateChanges(invokeClaimInternal.stateChanges, 6, 1, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      expect(invokeClaimInternal.stateChanges.data).to.eql([{
        key: `%s%s%s__claimedReferral__${programName}__${referralAddress}`,
        type: 'integer',
        value: expectedNewClaimerClaimed,
      }, {
        key: `%s%s%s__unclaimedReferral__${programName}__${referralAddress}`,
        type: 'integer',
        value: expectedUnclaimed,
      }, {
        key: `%s%s__claimedTotal__${programName}`,
        type: 'integer',
        value: expectedNewClaimedTotal,
      }, {
        key: `%s%s__claimedTotalAddress__${referralAddress}`,
        type: 'integer',
        value: expectedNewClaimedTotalAddress,
      }, {
        key: `%s%s__unclaimedTotalAddress__${referralAddress}`,
        type: 'integer',
        value: expectedNewUnclaimedTotalAddress,
      }, {
        key: `%s%s%s%s%s__history__claimReferral__${programName}__${referralAddress}__${claimTx.id}`,
        type: 'string',
        value: `%d%d%d__${height}__${timestamp}__${expectedClaimerUnclaimedHistory}`,
      }]);

      expect(invokeClaimInternal.stateChanges.transfers).to.eql([{
        address: referralAddress,
        asset: this.wxAssetId,
        amount: expectedClaimerUnclaimed,
      }]);

      const invokeWithdrawReferralReward = invokeClaimInternal.stateChanges.invokes[0];

      expect(invokeWithdrawReferralReward.dApp).to.eql(treasuryContract);
      expect(invokeWithdrawReferralReward.call.function).to.eql('withdrawReferralReward');
      expect(invokeWithdrawReferralReward.call.args).to.eql([
        { type: 'Int', value: expectedClaimerUnclaimed },
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
        amount: expectedClaimerUnclaimed,
      }]);
    },
  );
});
