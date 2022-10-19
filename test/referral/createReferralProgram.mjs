import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: createReferralProgram.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully createReferralProgram',
    async function () {
      const programName = 'wxlock';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);

      const expectedRewardsTotal = 0;

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
      const { stateChanges } = await ni.waitForTx(createReferralProgramTx.id, { apiBase });

      expect(
        await checkStateChanges(stateChanges, 5, 0, 0, 0, 0, 0, 0, 0, 0),
      ).to.eql(true);

      expect(stateChanges.data).to.eql([{
        key: `%s%s__programName__${programName}`,
        type: 'boolean',
        value: true,
      }, {
        key: `%s%s__treasuryContract__${programName}`,
        type: 'string',
        value: treasuryContract,
      }, {
        key: `%s%s__implementationContract__${programName}`,
        type: 'string',
        value: implementationContract,
      }, {
        key: `%s%s__rewardAssetId__${programName}`,
        type: 'string',
        value: this.wxAssetId,
      }, {
        key: `%s%s__rewardsTotal__${programName}`,
        type: 'integer',
        value: expectedRewardsTotal,
      }]);
    },
  );
});
