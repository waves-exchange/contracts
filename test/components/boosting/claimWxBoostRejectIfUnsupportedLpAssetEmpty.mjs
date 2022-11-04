import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: claimWxBoostRejectIfUnsupportedLpAssetEmpty.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject claimWxBoost',
    async function () {
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const lpAssetIdStr = 'empty';
      const userAddressStr = address(this.accounts.user1, chainId);

      const expectedRejectMessage = 'not readonly mode: unsupported lp asset empty';

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

      const claimWxBoostTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [],
        call: {
          function: 'claimWxBoost',
          args: [
            { type: 'string', value: lpAssetIdStr },
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
