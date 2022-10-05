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

describe('lp: unstakeAndGetRejectPoolShutdown.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject unstakeAndGet if PoolShutdown',
    async function () {
      const usdnAmount = 10e6;
      const shibAmount = 10e2;
      const lpAmount = 1e9;
      const shouldAutoStake = true;

      const expectedRejectMessage = 'Get operation is blocked by admin. Status = 4';

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

      const managePoolTx = invokeScript({
        dApp: address(this.accounts.factoryV2, chainId),
        call: {
          function: 'managePool',
          args: [
            { type: 'string', value: address(this.accounts.lp, chainId) },
            { type: 'integer', value: 4 },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(managePoolTx, {});
      await ni.waitForTx(managePoolTx.id, { apiBase });

      const unstakeAndGet = invokeScript({
        dApp: lp,
        call: {
          function: 'unstakeAndGet',
          args: [
            { type: 'integer', value: lpAmount },
          ],
        },
        chainId,
      }, this.accounts.user1);

      await expect(
        api.transactions.broadcast(unstakeAndGet, {}),
      ).to.be.rejectedWith(
        new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
      );
    },
  );
});
