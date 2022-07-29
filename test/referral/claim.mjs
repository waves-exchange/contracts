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

describe('referral: claim.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claim',
    async function () {
      const programName = 'ReferralProgram';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;
      const referralReward = 1e2;

      const expectedClaimed = 100;
      const expectedClaimedTotal = 100;
      const expectedUnclaimed = 0;
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
        dApp: referral,
        payment: [],
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: programName },
          ],
        },
        chainId,
      }, this.accounts.referralAccount);
      await api.transactions.broadcast(claimTx, {});
      const { height, stateChanges } = await ni.waitForTx(claimTx.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(height);

      expect(stateChanges.data).to.eql([{
        key: `%s%s%s%s__claimed__${programName}__${referralAddress}`,
        type: 'integer',
        value: expectedClaimed,
      }, {
        key: `%s%s__claimedTotal__${programName}`,
        type: 'integer',
        value: expectedClaimedTotal,
      }, {
        key: `%s%s%s%s__unclaimed__${programName}__${referralAddress}`,
        type: 'integer',
        value: expectedUnclaimed,
      }, {
        key: `%s%s%s%s%s__history__claim__${programName}__${referralAddress}__${claimTx.id}`,
        type: 'string',
        value: `%d%d%d__${height}__${timestamp}__${expectedClaimerUnclaimedHistory}`,
      }]);

      expect(stateChanges.transfers).to.eql([{
        address: referralAddress,
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
