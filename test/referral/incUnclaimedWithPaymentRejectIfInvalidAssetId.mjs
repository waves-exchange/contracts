import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, massTransfer, libs, nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;
const seed = 'waves private node seed with waves tokens';
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('referral: incUnclaimedWithPaymentRejectIfInvalidAssetId.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject incUnclaimedWithPayment',
    async function () {
      const programName = 'wxSpotFee';
      const treasuryContract = address(this.accounts.treasury, chainId);
      const implementationContract = address(this.accounts.implementation, chainId);
      const referrerAddress = address(this.accounts.referrerAccount, chainId);
      const referralAddress = address(this.accounts.referralAccount, chainId);
      const referral = address(this.accounts.referral, chainId);
      const referrerReward = 1e4;

      const bytes = libs.crypto.stringToBytes(
        `${programName}:${referrerAddress}:${referralAddress}`,
      );
      const signature = libs.crypto.signBytes(this.accounts.backend, bytes);

      const expectedRejectMessage = 'referral.ride: invalid asset id';

      const someAssetIssueTx = issue({
        name: 'someAsset',
        description: '',
        quantity: 100000e6,
        decimals: 6,
        chainId,
      }, seed);
      await api.transactions.broadcast(someAssetIssueTx, {});
      await ni.waitForTx(someAssetIssueTx.id, { apiBase });
      const someAssetId = someAssetIssueTx.id;

      const someAssetAmount = 100e6;
      const massTransferSomeAssetTx = massTransfer({
        transfers: [{
          recipient: address(this.accounts.implementation, chainId), amount: someAssetAmount,
        }],
        assetId: someAssetId,
        chainId,
      }, seed);
      await api.transactions.broadcast(massTransferSomeAssetTx, {});
      await ni.waitForTx(massTransferSomeAssetTx.id, { apiBase });

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
        payment: [
          { assetId: this.wxAssetId, amount: referrerReward },
          { assetId: someAssetId, amount: referrerReward },
        ],
        call: {
          function: 'incUnclaimedWithPayment',
          args: [
            { type: 'string', value: programName },
            { type: 'list', value: [{ type: 'string', value: referrerAddress }] },
          ],
        },
        chainId,
      }, this.accounts.implementation);

      await expect(
        api.transactions.broadcast(incUnclaimedWithPaymentTx, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
      );
    },
  );
});
