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

describe('proxy_pepe: withdraw.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully send sWaves and receive Waves',
    async function () {
      const proxyPepe = address(this.accounts.proxyPepe, chainId);
      const depositTx = invokeScript({
        dApp: proxyPepe,
        payment: [{
          amount: 1e8,
          assetId: this.sWavesAssetId,
        }],
        call: {
          function: 'withdraw',
          args: [],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(depositTx, {});
      const { stateChanges } = await ni.waitForTx(depositTx.id, { apiBase });

      expect(stateChanges.transfers).to.deep.eql([{
        address: address(this.accounts.user1, chainId),
        amount: 1.5e8,
        asset: null,
      }]);
    },
  );
});
