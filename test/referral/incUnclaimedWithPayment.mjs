import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, libs, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: incUnclaimedWithPayment.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully incUnclaimedWithPayment',
    async function () {
      const programName = 'ReferralProgram';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;

      const expectedInvokesCount = 1;

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

      const incUnclaimedWithPaymentTx = invokeScript({
        dApp: referral,
        payment: [{ assetId: this.wxAssetId, amount: referrerReward }],
        call: {
          function: 'incUnclaimedWithPayment',
          args: [
            { type: 'string', value: programName },
            { type: 'list', value: [{ type: 'string', value: referrerAddress }] },
          ],
        },
        chainId,
      }, this.accounts.implementation);
      await api.transactions.broadcast(incUnclaimedWithPaymentTx, {});
      const { stateChanges } = await ni.waitForTx(incUnclaimedWithPaymentTx.id, { apiBase });

      expect(
        await checkStateChanges(stateChanges, 0, 1, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      expect(stateChanges.transfers).to.eql([{
        address: treasuryContract,
        asset: this.wxAssetId,
        amount: referrerReward,
      }]);

      const { invokes } = stateChanges;
      expect(invokes.length).to.eql(expectedInvokesCount);

      expect(
        await checkStateChanges(invokes[0].stateChanges, 3, 0, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      expect(invokes[0].dApp).to.eql(address(this.accounts.referral, chainId));
      expect(invokes[0].call.function).to.eql('incUnclaimedWithPaymentInternal');
      expect(invokes[0].call.args).to.eql([
        {
          type: 'Array',
          value: [
            {
              type: 'Int',
              value: referrerReward,
            },
          ],
        }, {
          type: 'String',
          value: programName,
        }, {
          type: 'Array',
          value: [
            {
              type: 'String',
              value: referrerAddress,
            },
          ],
        }, {
          type: 'Int',
          value: 0,
        }, {
          type: 'Int',
          value: 0,
        }]);
      expect(invokes[0].payment).to.eql([]);

      expect(invokes[0].stateChanges.data).to.eql([{
        key: `%s%s__unclaimedTotalAddress__${referrerAddress}`,
        type: 'integer',
        value: referrerReward,
      }, {
        key: `%s%s%s__unclaimedReferrer__${programName}__${referrerAddress}`,
        type: 'integer',
        value: referrerReward,
      }, {
        key: `%s%s__rewardsTotal__${programName}`,
        type: 'integer',
        value: referrerReward,
      }]);

      expect(invokes[0].stateChanges.invokes.length).to.eql(expectedInvokesCount);

      expect(
        await checkStateChanges(
          invokes[0].stateChanges.invokes[0].stateChanges,
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

      expect(invokes[0].stateChanges.invokes[0].dApp).to.eql(
        address(this.accounts.referral, chainId),
      );
      expect(invokes[0].stateChanges.invokes[0].call.function).to.eql('incUnclaimedWithPaymentInternal');
      expect(invokes[0].stateChanges.invokes[0].call.args).to.eql([
        {
          type: 'Array',
          value: [
            {
              type: 'Int',
              value: referrerReward,
            },
          ],
        }, {
          type: 'String',
          value: programName,
        }, {
          type: 'Array',
          value: [
            {
              type: 'String',
              value: referrerAddress,
            },
          ],
        }, {
          type: 'Int',
          value: 1,
        }, {
          type: 'Int',
          value: referrerReward,
        }]);
      expect(invokes[0].stateChanges.invokes[0].payment).to.eql([]);
    },
  );
});
