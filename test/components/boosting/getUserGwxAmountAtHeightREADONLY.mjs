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

describe('boosting: getUserGwxAmountAtHeightREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully getUserGwxAmountAtHeightREADONLY',
    async function () {
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const userAddressStr = address(this.accounts.user1, chainId);
      const k = 1000;
      const b = 10;

      const lockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lock',
          args: [
            { type: 'integer', value: duration },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(lockTx, {});
      await ni.waitForTx(lockTx.id, { apiBase });

      const setKTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [{
          key: '%s%d%s__paramByUserNum__0__k',
          type: 'integer',
          value: k,
        }],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setKTx, {});
      await ni.waitForTx(setKTx.id, { apiBase });

      const setBTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [{
          key: '%s%d%s__paramByUserNum__0__b',
          type: 'integer',
          value: b,
        }],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setBTx, {});
      const { height } = await ni.waitForTx(setBTx.id, { apiBase });

      const expectedGwxAmount = Math.floor((k * height + b) / 1000);

      const expr = `getUserGwxAmountAtHeightREADONLY(\"${userAddressStr}\", ${height})`; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(
        address(this.accounts.boosting, chainId),
        expr,
      );
      const checkData = response.result.value._2; /* eslint-disable-line */

      expect(checkData).to.eql({
        type: 'Int',
        value: expectedGwxAmount,
      });
    },
  );
});
