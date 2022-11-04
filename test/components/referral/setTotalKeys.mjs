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

describe('referral: setTotalKeys.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully setTotalKeys',
    async function () {
      const programName = 'wxlock';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referral = address(this.accounts.referral, chainId);
      const referrerReward = 1e4;
      const referralReward = 1e2;

      const bytes = libs.crypto.stringToBytes(
        `${programName}:${referrerAddress}:${referralAddress}`,
      );
      const signature = libs.crypto.signBytes(this.accounts.backend, bytes);

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

      const someAccount = this.accounts.implementation;
      const setTotalKeysTx = invokeScript({
        dApp: referral,
        payment: [],
        call: {
          function: 'setTotalKeys',
          args: [
            { type: 'string', value: programName },
            { type: 'string', value: referrerAddress },
          ],
        },
        chainId,
      }, someAccount);
      await api.transactions.broadcast(setTotalKeysTx, {});
      const { stateChanges } = await ni.waitForTx(setTotalKeysTx.id, { apiBase });

      expect(
        await checkStateChanges(stateChanges, 2, 0, 0, 0, 0, 0, 0, 0, 0),
      ).to.eql(true);

      expect(stateChanges.data).to.eql([
        {
          key: `%s%s__claimedTotalAddress__${referrerAddress}`,
          type: 'integer',
          value: 0,
        }, {
          key: `%s%s__unclaimedTotalAddress__${referrerAddress}`,
          type: 'integer',
          value: referrerReward,
        }]);
    },
  );
});
