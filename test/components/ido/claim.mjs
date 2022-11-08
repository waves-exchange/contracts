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
            { type: 'string', value: this.usdnAssetId },
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

      const expectedUsdnAmount = (amountUsdn / this.claimDuration) * (height - this.claimStart);
      const expectedTotalAmount = amountUsdn;
      const expectedRemainingAmount = amountUsdn - expectedUsdnAmount;
      const expectedClaimedPriceAssetAmount = expectedUsdnAmount;
      const expectedClaimedIdoAssetAmount = 0;
      const expectedLastClaimedHeight = height;
      const expectedPriceAssetBalance = 0;
      const expectedPutOneTknV2PriceAssetAmount = 100e6;

      expect(payment).to.eql([]);

      expect(
        await checkStateChanges(stateChanges, 9, 1, 0, 0, 0, 0, 0, 0, 2),
      ).to.eql(true);

      expect(stateChanges.data).to.eql([{
        key: '%s__currentPeriod',
        type: 'integer',
        value: 0,
      }, {
        key: '%s%s__periodStartHeight__0',
        type: 'integer',
        value: height,
      }, {
        key: '%s%s__periodEndHeight__0',
        type: 'integer',
        value: height + 2,
      }, {
        key: `%s%s%s__periodTotalAvailableToClaim__${this.usdnAssetId}__0`,
        type: 'integer',
        value: this.totalPeriodAllowance - expectedUsdnAmount,
      }, {
        key: `%s%s%s%s__periodUserAvailableToClaim__${this.usdnAssetId}__0__${address(this.accounts.user1, chainId)}`,
        type: 'integer',
        value: this.userPeriodAllowance - expectedUsdnAmount,
      }, {
        key: `%s%s%s%s__history__claim__${address(this.accounts.user1, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d__${height}__${timestamp}__${expectedUsdnAmount}__0`,
      }, {
        key: `%s__${address(this.accounts.user1, chainId)}`,
        type: 'string',
        value: `%d%d%d%d%d__${expectedTotalAmount}__${expectedRemainingAmount}__${expectedClaimedPriceAssetAmount}__${expectedClaimedIdoAssetAmount}__${expectedLastClaimedHeight}`,
      }, {
        key: '%s__totals',
        type: 'string',
        value: `%d%d%d%d%d__${expectedTotalAmount}__${expectedRemainingAmount}__${expectedClaimedPriceAssetAmount}__${expectedClaimedIdoAssetAmount}__${expectedLastClaimedHeight}`,
      }, {
        key: `%s%s__priceAssetBalance__${address(this.accounts.user1, chainId)}`,
        type: 'integer',
        value: expectedPriceAssetBalance,
      }]);

      expect(stateChanges.transfers).to.eql([{
        address: address(this.accounts.user1, chainId),
        asset: this.usdnAssetId,
        amount: expectedUsdnAmount,
      }]);

      expect(
        await checkStateChanges(
          stateChanges.invokes[0].stateChanges,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ),
      ).to.eql(true);

      expect(stateChanges.invokes[0].dApp).to.eql(address(this.accounts.lpStable, chainId));
      expect(stateChanges.invokes[0].call.function).to.eql('putOneTknV2WithoutTakeFeeREADONLY');
      expect(stateChanges.invokes[0].call.args).to.eql([{
        type: 'Int',
        value: expectedPutOneTknV2PriceAssetAmount,
      }, {
        type: 'String',
        value: this.usdnAssetId,
      }]);
      expect(stateChanges.invokes[0].payment).to.eql([]);

      expect(
        await checkStateChanges(
          stateChanges.invokes[1].stateChanges,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ),
      ).to.eql(true);

      expect(stateChanges.invokes[1].dApp).to.eql(address(this.accounts.lpStable, chainId));
      expect(stateChanges.invokes[1].call.function).to.eql('getOneTknV2READONLY');
      expect(stateChanges.invokes[1].call.args).to.eql([{
        type: 'String',
        value: this.usdtAssetId,
      }, {
        type: 'Int',
        value: amountUsdn,
      }]);
      expect(stateChanges.invokes[1].payment).to.eql([]);
    },
  );
});
