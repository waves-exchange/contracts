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

describe('boosting: lockRefRejectIfDurationLessThenMinLockDuration.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject lockRef',
    async function () {
      const durationLessThenMinLockDuration = this.minDuration - 1;
      const referrerAddress = '';
      const signature = '';
      const assetAmount = this.minLockAmount;

      const expectedRejectMessage = `passed duration is less then minLockDuration=${this.minDuration}`;

      const lockRefTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lockRef',
          args: [
            { type: 'integer', value: durationLessThenMinLockDuration },
            { type: 'string', value: referrerAddress },
            { type: 'string', value: signature },
          ],
        },
        chainId,
      }, this.accounts.manager);

      await expect(
        api.transactions.broadcast(lockRefTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
