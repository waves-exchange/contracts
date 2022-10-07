import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  data, invokeScript, libs, nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { setScriptFromFile } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

const mockRidePath = join('test', 'referral', 'mock');
const implementationPath = format({ dir: mockRidePath, base: 'implementation.mock.ride' });

describe('referral: claimReferral.mjs', /** @this {MochaSuiteModified} */() => {
  const programName = 'ReferralProgram';
  const referralReward = 1e2;
  before(async function () {
    await setScriptFromFile(implementationPath, this.accounts.implementation);

    const setWxAssetIdImplementationTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'assetId',
          type: 'string',
          value: this.wxAssetId,
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setWxAssetIdImplementationTx, {});
    await ni.waitForTx(setWxAssetIdImplementationTx.id, { apiBase });

    const setMockAmountTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'amount',
          type: 'integer',
          value: referralReward,
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setMockAmountTx, {});
    await ni.waitForTx(setMockAmountTx.id, { apiBase });

    const setReferralProgramNameTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'programName',
          type: 'string',
          value: programName,
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setReferralProgramNameTx, {});
    await ni.waitForTx(setReferralProgramNameTx.id, { apiBase });

    const setKeyReferralsContractAddressTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'referralAddress',
          type: 'string',
          value: address(this.accounts.referral, chainId),
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setKeyReferralsContractAddressTx, {});
    await ni.waitForTx(setKeyReferralsContractAddressTx.id, { apiBase });
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

      expect(stateChanges.transfers).to.eql([{
        address: referralAddress,
        asset: this.wxAssetId,
        amount: expectedClaimerUnclaimed,
      }]);

      const { invokes } = stateChanges;
      expect(invokes[0].dApp).to.eql(referral);
      expect(invokes[0].call.function).to.eql('claim');
      expect(invokes[0].call.args).to.eql([{
        type: 'String',
        value: 'ReferralProgram',
      }]);

      expect(invokes[0].stateChanges.invokes[0].stateChanges.data).to.eql([{
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
    },
  );
});
