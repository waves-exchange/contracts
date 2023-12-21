import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('ido: claimDisabled.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject XTN claim if height > claimClosingHeight',
    async function () {
      const setIdoKeysTx = data({
        additionalFee: 4e5,
        data: [{
          key: '%s__claimClosingHeight',
          type: 'integer',
          value: 1,
        }],
        chainId,
      }, this.accounts.ido);
      await api.transactions.broadcast(setIdoKeysTx, {});

      const ido = address(this.accounts.ido, chainId);
      const amountUsdn = this.minInvestAmount * 10;

      const investTx = invokeScript({
        dApp: ido,
        payment: [
          { assetId: this.usdnAssetId, amount: amountUsdn },
        ],
        call: {
          function: 'invest',
          args: [],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(investTx, {});
      await ni.waitForTx(investTx.id, { apiBase });

      await ni.waitForHeight(this.claimStart + 1, { apiBase });

      const claimTx = invokeScript({
        dApp: ido,
        payment: [],
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: this.usdnAssetId },
            { type: 'string', value: address(this.accounts.user1, chainId) },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await expect(api.transactions.broadcast(claimTx, {})).to.be.rejectedWith('Claim is disabled');

      const claimTx2 = invokeScript({
        dApp: ido,
        payment: [],
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: this.wxAssetId },
            { type: 'string', value: address(this.accounts.user1, chainId) },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await expect(api.transactions.broadcast(claimTx2, {})).to.be.fulfilled;
    },
  );
});
