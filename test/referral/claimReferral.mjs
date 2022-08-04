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
  before(async function () {
    await setScriptFromFile(implementationPath, this.accounts.implementation);

    const setWxAssetIdImplementationTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__wxAssetId',
          type: 'string',
          value: this.wxAssetId,
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setWxAssetIdImplementationTx, {});
    await waitForTx(setWxAssetIdImplementationTx.id, { apiBase });

    const mockAmount = 10000;
    const setMockAmountTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'mockAmount',
          type: 'integer',
          value: mockAmount,
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setMockAmountTx, {});
    await waitForTx(setMockAmountTx.id, { apiBase });

    const setReferralProgramNameTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'referralProgramName',
          type: 'string',
          value: programName,
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setReferralProgramNameTx, {});
    await waitForTx(setReferralProgramNameTx.id, { apiBase });

    const setKeyReferralsContractAddressTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'referralsContractAddress',
          type: 'string',
          value: address(accounts.referral, chainId),
        },
      ],
      chainId,
    }, this.accounts.implementation);
    await api.transactions.broadcast(setKeyReferralsContractAddressTx, {});
    await waitForTx(setKeyReferralsContractAddressTx.id, { apiBase });
  });

  it(
    'should successfully claim',
    async function () {
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;
      const referralReward = 1e2;

      const expectedClaimed = 10000;
      const expectedClaimedTotal = 10000;
      const expectedUnclaimed = 0;
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

      expect(stateChanges.data).to.eql([{
        key: `%s%s%s%s__claimedReferral__${programName}__${referrerAddress}`,
        type: 'integer',
        value: expectedClaimed,
      }, {
        key: `%s%s__claimedTotal__${programName}`,
        type: 'integer',
        value: expectedClaimedTotal,
      }, {
        key: `%s%s%s%s__unclaimedReferral__${programName}__${referrerAddress}`,
        type: 'integer',
        value: expectedUnclaimed,
      }, {
        key: `%s%s%s%s%s__history__claim__${programName}__${referrerAddress}__${claimTx.id}`,
        type: 'string',
        value: `%d%d%d__${height}__${timestamp}__${expectedClaimerUnclaimedHistory}`,
      }]);

      expect(stateChanges.transfers).to.eql([{
        address: referrerAddress,
        asset: this.wxAssetId,
        amount: expectedClaimed,
      }]);

      expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
        .to.deep.include.members([
          [treasuryContract, 'withdrawReferralReward'],
        ]);
    },
  );
});
