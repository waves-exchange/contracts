import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni, transfer } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { flattenData } from './contract/tools.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_stable: refreshDLp.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully refreshDLp',
    async function () {
      const usdnAmount = 1e16 / 10;
      const usdtAmount = 1e8 / 10;
      const shouldAutoStake = false;
      const delay = 2;

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
      const { height } = await ni.waitForTx(put.id, { apiBase });

      await api.transactions.broadcast(transfer({
        amount: usdtAmount,
        assetId: this.usdtAssetId,
        recipient: lpStable,
      }, this.accounts.user1), {});

      await ni.waitForHeight(height + delay, { apiBase });

      const getNoLess = invokeScript({
        dApp: lpStable,
        payment: [],
        call: {
          function: 'refreshDLp',
          args: [],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(getNoLess, {});
      const { stateChanges, height: refreshHeight } = await ni.waitForTx(getNoLess.id, { apiBase });

      expect(flattenData(stateChanges)).to.include.deep.members([{
        key: '%s__dLpRefreshedHeight',
        type: 'integer',
        value: refreshHeight,
      }, {
        key: '%s__dLp',
        type: 'string',
        value: '12569372929872107410759846168',
      }]);
    },
  );
});
