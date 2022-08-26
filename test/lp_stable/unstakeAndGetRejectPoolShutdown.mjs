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

describe('lpStable: unstakeAndGetRejectPoolShutdown.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject unstakeAndGet if PoolShutdown',
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

      const managePoolTx = invokeScript({
        dApp: address(this.accounts.factoryV2, chainId),
        call: {
          function: 'managePool',
          args: [
            { type: 'string', value: address(this.accounts.lpStable, chainId) },
            { type: 'integer', value: 4 },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(managePoolTx, {});
      await ni.waitForTx(managePoolTx.id, { apiBase });

      const unstakeAndGet = invokeScript({
        dApp: lpStable,
        call: {
          function: 'unstakeAndGet',
          args: [
            { type: 'integer', value: lpStableAmount },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(api.transactions.broadcast(unstakeAndGet, {})).to.be.rejectedWith(
        /^Error while executing account-script: lp_stable.ride: Blocked: 4$/,
      );
    },
  );
});
