import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { invokeScript, data, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp: forceStop_pool.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject if pool force stopped in ForceStop contract',
    async function () {
      const usdnAmount = 10e6;
      const shibAmount = 10e2;
      const shouldAutoStake = false;

      const lp = address(this.accounts.lp, chainId);
      // const factoryAddress = address(this.accounts.factoryV2, chainId);
      const forceStopAddress = address(this.accounts.forceStop, chainId);
      const factoryDataTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: '%s__forceStopContract',
            type: 'string',
            value: forceStopAddress,
          },
        ],
        chainId,
        senderPublicKey: publicKey(this.accounts.factoryV2),
      }, this.accounts.manager);
      await api.transactions.broadcast(factoryDataTx, {});
      await ni.waitForTx(factoryDataTx.id, { apiBase });

      const forceStopDataTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: `%s%s__disabled__${lp}`,
            type: 'boolean',
            value: true,
          },
        ],
        chainId,
      }, this.accounts.forceStop);
      await api.transactions.broadcast(forceStopDataTx, {});
      await ni.waitForTx(forceStopDataTx.id, { apiBase });

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
      return expect(api.transactions.broadcast(put, {})).to.be.rejectedWith('Force stopped');
    },
  );
});
