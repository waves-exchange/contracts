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
            { type: 'string', value: this.wxAssetId },
            { type: 'string', value: address(this.accounts.user1, chainId) },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(claimTx, {});
      const {
        height, stateChanges, id, payment,
      } = await ni.waitForTx(claimTx.id, { apiBase });

      const { timestamp } = await api.blocks.fetchHeadersAt(height);

      const expectedUsdnAmount = (amountUsdn / this.claimDuration)
        * (height - this.claimStart);
      const expectedIdoAmount = expectedUsdnAmount * 1e2;
      const expectedTotalAmount = amountUsdn;
      const expectedRemainingAmount = amountUsdn - expectedUsdnAmount;
      const expectedClaimedPriceAssetAmount = 0;
      const expectedClaimedIdoAssetAmount = expectedIdoAmount;
      const expectedLastClaimedHeight = height;
      const expectedPriceAssetBalance = 0;

      expect(payment).to.eql([]);
      expect(
        await checkStateChanges(stateChanges, 4, 1, 0, 0, 0, 0, 0, 0, 0),
      ).to.eql(true);

      expect(stateChanges.data).to.eql([{
        key: `%s%s__priceAssetBalance__${address(this.accounts.user1, chainId)}`,
        type: 'integer',
        value: expectedPriceAssetBalance,
      }, {
        key: `%s__${address(this.accounts.user1, chainId)}`,
        type: 'string',
        value: `%d%d%d%d%d__${expectedTotalAmount}__${expectedRemainingAmount}__${expectedClaimedPriceAssetAmount}__${expectedClaimedIdoAssetAmount}__${expectedLastClaimedHeight}`,
      }, {
        key: '%s__totals',
        type: 'string',
        value: `%d%d%d%d%d__${expectedTotalAmount}__${expectedRemainingAmount}__${expectedClaimedPriceAssetAmount}__${expectedClaimedIdoAssetAmount}__${expectedLastClaimedHeight}`,
      }, {
        key: `%s%s%s%s__history__claim__${address(this.accounts.user1, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d__${height}__${timestamp}__0__${expectedIdoAmount}`,
      }]);

      expect(stateChanges.transfers).to.eql([{
        address: address(this.accounts.user1, chainId),
        asset: this.wxAssetId,
        amount: expectedIdoAmount,
      }]);
    },
  );
});
