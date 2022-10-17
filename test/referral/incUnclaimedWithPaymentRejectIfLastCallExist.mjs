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

describe('referral: incUnclaimedWithPaymentRejectIfLastCallExist.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully incUnclaimedWithPayment',
    async function () {
      const programName = 'ReferralProgram';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referrerReward = 1e4;

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
      const { height } = await ni.waitForTx(incUnclaimedWithPaymentTx.id, { apiBase });

      const repeatIncUnclaimedWithPaymentTx = invokeScript({
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

      const { height: currentHeight } = await api.blocks.fetchHeight();
      const expectedRejectMessage = `referral.ride: wait ${currentHeight - height + 3} blocks`;

      await expect(
        api.transactions.broadcast(repeatIncUnclaimedWithPaymentTx, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
      );
    },
  );
});
