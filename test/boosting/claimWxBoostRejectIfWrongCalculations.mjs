import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: claimWxBoostRejectIfWrongCalculations.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claimWxBoost',
    async function () {
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const someLpAssetIdStr = '2DnDS3MqJFjopXx4Wtyv7uvt3Jdt6hBoR6gAbjBiceEg';
      const somePoolContract = '3Mt3gNcHWcJYCuFHYtsggAdFadVGso8RNjB';
      const userAddressStr = address(this.accounts.user1, chainId);

      const lockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lock',
          args: [
            { type: 'integer', value: duration },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(lockTx, {});
      await ni.waitForTx(lockTx.id, { apiBase });

      const setLpAsset2PoolContractTx = data({
        additionalFee: 4e5,
        data: [{
          key: `%s%s%s__${someLpAssetIdStr}__mappings__lpAsset2PoolContract`,
          type: 'string',
          value: somePoolContract,
        }],
        chainId,
      }, this.accounts.factoryV2);
      await api.transactions.broadcast(setLpAsset2PoolContractTx, {});
      await ni.waitForTx(setLpAsset2PoolContractTx.id, { apiBase });

      const setPoolWeightTx = data({
        additionalFee: 4e5,
        data: [{
          key: `%s%s__poolWeight__${somePoolContract}`,
          type: 'integer',
          value: 0,
        }],
        chainId,
      }, this.accounts.factoryV2);
      await api.transactions.broadcast(setPoolWeightTx, {});
      const { height } = await ni.waitForTx(setPoolWeightTx.id, { apiBase });

      const ratePerBlock = height + 1e3;
      const setRatePerBlockTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: '%s%s__ratePerBlock__current',
            type: 'integer',
            value: ratePerBlock,
          },
        ],
        chainId,
      }, this.accounts.emission);
      await api.transactions.broadcast(setRatePerBlockTx, {});
      await ni.waitForTx(setRatePerBlockTx.id, { apiBase });

      const setUserBoostEmissionLastIntTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: '%s%d__userBoostEmissionLastInt__0',
            type: 'integer',
            value: 10,
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setUserBoostEmissionLastIntTx, {});
      await ni.waitForTx(setUserBoostEmissionLastIntTx.id, { apiBase });

      const expectedRejectMessage = 'wrong calculations';

      const claimWxBoostTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [],
        call: {
          function: 'claimWxBoost',
          args: [
            { type: 'string', value: someLpAssetIdStr },
            { type: 'string', value: userAddressStr },
          ],
        },
        chainId,
      }, this.accounts.staking);

      await expect(
        api.transactions.broadcast(claimWxBoostTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: ${expectedRejectMessage}`,
      );
    },
  );
});
