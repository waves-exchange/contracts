import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('ido: claim.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claim',
    async function () {
      const ido = address(this.accounts.ido, chainId);
      const amountUsdn = this.minInvestAmount * 10;
      const amountWx = amountUsdn;

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
      const {
        id: idInvest, height: heightInvest,
      } = await ni.waitForTx(investTx.id, { apiBase });

      const { timestampInvest } = await api.blocks.fetchHeadersAt(heightInvest);

      await ni.waitForHeight(this.claimStart, { apiBase });

      const claimTx = invokeScript({
        dApp: ido,
        payment: [
          // { assetId: this.wxAssetId, amount: amountWx },
        ],
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: this.usdnAssetId },
            { type: 'string', value: address(this.accounts.user1, chainId) },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(claimTx, {});
      const { sateChanges } = await ni.waitForTx(claimTx.id, { apiBase });

      // expect(
      //   await checkStateChanges(stateChanges, 3, 0, 0, 0, 0, 0, 0, 0, 0),
      // ).to.eql(true);
      //
      // const expectedTotalAmount = 10e6;
      // const expectedRemainingAmount = 10e6;
      // const expectedClaimedPriceAssetAmount = 0;
      // const expectedClaimedIdoAssetAmount = 0;
      // const expectedPriceAssetAmount = amountUsdn;
      // const expectedIdoAssetAmount = 0;
      // const expectedLastClaimedHeight = this.claimStart;
      //
      // expect(stateChanges.data).to.eql([{
      //   key: `%s__${address(this.accounts.user1, chainId)}`,
      //   type: 'string',
      //   value: `%d%d%d%d%d__${expectedTotalAmount}__${expectedRemainingAmount}__${expectedClaimedPriceAssetAmount}__${expectedClaimedIdoAssetAmount}__${expectedLastClaimedHeight}`,
      // }, {
      //   key: '%s__totals',
      //   type: 'string',
      //   value: `%d%d%d%d%d__${expectedTotalAmount}__${expectedRemainingAmount}__${expectedClaimedPriceAssetAmount}__${expectedClaimedIdoAssetAmount}__${expectedLastClaimedHeight}`,
      // }, {
      //   key: `%s%s%s%s__history__invest__${address(this.accounts.user1, chainId)}__${id}`,
      //   type: 'string',
      //   value: `%d%d%d%d__${height}__${timestamp}__${expectedPriceAssetAmount}__${expectedIdoAssetAmount}`,
      // }]);
    },
  );
});
