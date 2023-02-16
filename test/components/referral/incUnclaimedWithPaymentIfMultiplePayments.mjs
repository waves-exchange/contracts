import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: incUnclaimedWithPaymentIfMultiplePayments.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully incUnclaimedWithPayment',
    async function () {
      const programName = 'wxSpotFee';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);

      const user1 = referrerAddress;
      const user2 = referralAddress;
      const user3 = address(this.accounts.backend, chainId);
      const amountUser1 = 1e4;
      const amountUser2 = 1e5;
      const amountUser3 = 1e6;

      const expectedInvokesCount = 1;

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

      const incUnclaimedWithPaymentTx = invokeScript({
        dApp: referral,
        payment: [
          { assetId: this.wxAssetId, amount: amountUser1 },
          { assetId: this.wxAssetId, amount: amountUser2 },
          { assetId: this.wxAssetId, amount: amountUser3 },
        ],
        call: {
          function: 'incUnclaimedWithPayment',
          args: [
            { type: 'string', value: programName },
            {
              type: 'list',
              value: [
                { type: 'string', value: user1 },
                { type: 'string', value: user2 },
                { type: 'string', value: user3 },
              ],
            },
          ],
        },
        chainId,
      }, this.accounts.implementation);
      await api.transactions.broadcast(incUnclaimedWithPaymentTx, {});
      const {
        stateChanges,
      } = await ni.waitForTx(incUnclaimedWithPaymentTx.id, { apiBase });

      expect(
        await checkStateChanges(stateChanges, 0, 1, 0, 0, 0, 0, 0, 0, 1),
      ).to.eql(true);

      expect(stateChanges.transfers).to.eql([{
        address: treasuryContract,
        asset: this.wxAssetId,
        amount: amountUser1 + amountUser2 + amountUser3,
      }]);

      const { invokes } = stateChanges;
      expect(invokes.length).to.eql(expectedInvokesCount);

      expect(
        await checkStateChanges(
          invokes[0].stateChanges,
          4,
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

      expect(invokes[0].dApp).to.eql(address(this.accounts.referral, chainId));
      expect(invokes[0].call.function).to.eql('incUnclaimedWithPaymentInternal');
      expect(invokes[0].call.args).to.eql([
        {
          type: 'Array',
          value: [
            { type: 'Int', value: amountUser1 },
            { type: 'Int', value: amountUser2 },
            { type: 'Int', value: amountUser3 },
          ],
        }, {
          type: 'String',
          value: programName,
        }, {
          type: 'Array',
          value: [
            { type: 'String', value: user1 },
            { type: 'String', value: user2 },
            { type: 'String', value: user3 },
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
        key: `%s%s__unclaimedTotalAddress__${user1}`,
        type: 'integer',
        value: amountUser1,
      }, {
        key: `%s%s%s__unclaimedReferrer__${programName}__${user1}`,
        type: 'integer',
        value: amountUser1,
      }, {
        key: `%s%s__rewardsTotal__${programName}`,
        type: 'integer',
        value: amountUser1 + amountUser2 + amountUser3,
      }, {
        key: `%s%s__allReferralPrograms__${user1}`,
        type: 'string',
        value: programName,
      }]);

      const nestedInvokes1 = invokes[0].stateChanges.invokes;
      expect(nestedInvokes1.length).to.eql(expectedInvokesCount);

      expect(
        await checkStateChanges(
          nestedInvokes1[0].stateChanges,
          4,
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

      expect(nestedInvokes1[0].dApp).to.eql(address(this.accounts.referral, chainId));
      expect(nestedInvokes1[0].call.function).to.eql('incUnclaimedWithPaymentInternal');
      expect(nestedInvokes1[0].call.args).to.eql([
        {
          type: 'Array',
          value: [
            { type: 'Int', value: amountUser1 },
            { type: 'Int', value: amountUser2 },
            { type: 'Int', value: amountUser3 },
          ],
        }, {
          type: 'String',
          value: programName,
        }, {
          type: 'Array',
          value: [
            { type: 'String', value: user1 },
            { type: 'String', value: user2 },
            { type: 'String', value: user3 },
          ],
        }, {
          type: 'Int',
          value: 1,
        }, {
          type: 'Int',
          value: amountUser1,
        }]);
      expect(nestedInvokes1[0].payment).to.eql([]);

      expect(nestedInvokes1[0].stateChanges.data).to.eql([{
        key: `%s%s__unclaimedTotalAddress__${user2}`,
        type: 'integer',
        value: amountUser2,
      }, {
        key: `%s%s%s__unclaimedReferrer__${programName}__${user2}`,
        type: 'integer',
        value: amountUser2,
      }, {
        key: `%s%s__rewardsTotal__${programName}`,
        type: 'integer',
        value: amountUser2 + amountUser3,
      }, {
        key: `%s%s__allReferralPrograms__${user2}`,
        type: 'string',
        value: programName,
      }]);

      const nestedInvokes2 = nestedInvokes1[0].stateChanges.invokes;
      expect(nestedInvokes2.length).to.eql(expectedInvokesCount);

      expect(
        await checkStateChanges(
          nestedInvokes2[0].stateChanges,
          4,
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

      expect(nestedInvokes2[0].dApp).to.eql(address(this.accounts.referral, chainId));
      expect(nestedInvokes2[0].call.function).to.eql('incUnclaimedWithPaymentInternal');
      expect(nestedInvokes2[0].call.args).to.eql([
        {
          type: 'Array',
          value: [
            { type: 'Int', value: amountUser1 },
            { type: 'Int', value: amountUser2 },
            { type: 'Int', value: amountUser3 },
          ],
        }, {
          type: 'String',
          value: programName,
        }, {
          type: 'Array',
          value: [
            { type: 'String', value: user1 },
            { type: 'String', value: user2 },
            { type: 'String', value: user3 },
          ],
        }, {
          type: 'Int',
          value: 2,
        }, {
          type: 'Int',
          value: amountUser1 + amountUser2,
        }]);
      expect(nestedInvokes2[0].payment).to.eql([]);

      expect(nestedInvokes2[0].stateChanges.data).to.eql([{
        key: `%s%s__unclaimedTotalAddress__${user3}`,
        type: 'integer',
        value: amountUser3,
      }, {
        key: `%s%s%s__unclaimedReferrer__${programName}__${user3}`,
        type: 'integer',
        value: amountUser3,
      }, {
        key: `%s%s__rewardsTotal__${programName}`,
        type: 'integer',
        value: amountUser3,
      }, {
        key: `%s%s__allReferralPrograms__${user3}`,
        type: 'string',
        value: programName,
      }]);

      const nestedInvokes3 = nestedInvokes2[0].stateChanges.invokes;
      expect(nestedInvokes3.length).to.eql(expectedInvokesCount);

      expect(
        await checkStateChanges(
          nestedInvokes3[0].stateChanges,
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

      expect(nestedInvokes3[0].dApp).to.eql(address(this.accounts.referral, chainId));
      expect(nestedInvokes3[0].call.function).to.eql('incUnclaimedWithPaymentInternal');
      expect(nestedInvokes3[0].call.args).to.eql([
        {
          type: 'Array',
          value: [
            { type: 'Int', value: amountUser1 },
            { type: 'Int', value: amountUser2 },
            { type: 'Int', value: amountUser3 },
          ],
        }, {
          type: 'String',
          value: programName,
        }, {
          type: 'Array',
          value: [
            { type: 'String', value: user1 },
            { type: 'String', value: user2 },
            { type: 'String', value: user3 },
          ],
        }, {
          type: 'Int',
          value: 3,
        }, {
          type: 'Int',
          value: amountUser1 + amountUser2 + amountUser3,
        }]);
      expect(nestedInvokes3[0].payment).to.eql([]);
    },
  );
});
