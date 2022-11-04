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

describe('boosting: lockRejectIfLockedWXs.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject lockRef',
    async function () {
      const duration = this.maxDuration - 1;
      const referrer = '';
      const signature = 'base64:';

      const assetAmount = this.minLockAmount;
      const paramByUserNum = 1;

      const expectedRejectMessage = 'there are locked WXs - consider to use increaseLock %s%d%s__paramByUserNum__0__amount';

      const setParamByUserNumStartTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: '%s%d%s__paramByUserNum__0__amount',
            type: 'integer',
            value: paramByUserNum,
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setParamByUserNumStartTx, {});
      await ni.waitForTx(setParamByUserNumStartTx.id, { apiBase });

      const lockRefTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lockRef',
          args: [
            { type: 'integer', value: duration },
            { type: 'string', value: referrer },
            { type: 'binary', value: signature },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(lockRefTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: ${expectedRejectMessage}`,
      );
    },
  );
});
