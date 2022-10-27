import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: lockRejectIfDurationGreaterThenMaxLockDuration.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject lockRef',
    async function () {
      const durationLessThenMaxLockDuration = this.maxDuration + 1;
      const referrer = '';
      const signature = 'base64:';

      const assetAmount = this.minLockAmount;

      const expectedRejectMessage = `passed duration is greater then maxLockDuration=${this.maxDuration}`;

      const lockRefTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lockRef',
          args: [
            { type: 'integer', value: durationLessThenMaxLockDuration },
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
