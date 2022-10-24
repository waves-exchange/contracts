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

describe('lpStable: unstakeAndGetRejectNoPayments.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject unstakeAndGet with payments',
    async function () {
      const usdnAmount = 1e16 / 10;
      const usdtAmount = 1e8 / 10;
      const lpStableAmount = 1e12;
      const shouldAutoStake = true;
      const lpStable = address(this.accounts.lpStable, chainId);

      const put = invokeScript({
        dApp: lpStable,
        payment: [
          { assetId: this.usdtAssetId, amount: usdtAmount },
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
        dApp: lpStable,
        payment: [
          { assetId: this.usdtAssetId, amount: usdtAmount },
        ],
        call: {
          function: 'unstakeAndGet',
          args: [
            { type: 'integer', value: lpStableAmount },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(api.transactions.broadcast(unstakeAndGet, {})).to.be.rejectedWith(
        /^Error while executing dApp: No pmnts expd$/,
      );
    },
  );
});
