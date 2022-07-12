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

describe('lp: unstakeAndGetRejectNoPayments.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject unstakeAndGet with payments',
    async function () {
      const usdnAmount = 1e16 / 10;
      const shibAmount = 1e8 / 10;
      const lpAmount = 1e12;
      const shouldAutoStake = true;
      const lp = address(this.accounts.lp, chainId);

      const put = invokeScript({
        dApp: lp,
        payment: [
          { assetId: this.shibAssetId, amount: shibAmount },
          { assetId: this.usdnAssetId, amount: usdnAmount },
        ],
        call: {
          function: 'put',
          args: [
            { type: 'integer', value: 0 },
            { type: 'boolean', value: shouldAutoStake },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(put, {});
      await ni.waitForTx(put.id, { apiBase });

      const unstakeAndGet = invokeScript({
        dApp: lp,
        payment: [
          { assetId: this.shibAssetId, amount: shibAmount },
        ],
        call: {
          function: 'unstakeAndGet',
          args: [
            { type: 'integer', value: lpAmount },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(api.transactions.broadcast(unstakeAndGet, {})).to.be.rejectedWith(
        /^Error while executing account-script: No payments are expected$/,
      );
    },
  );
});
