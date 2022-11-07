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

describe('ido: claimV2READONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claimV2READONLY',
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

      const { height } = await api.blocks.fetchHeight();

      const expectedUsdnAmount = (amountUsdn / this.claimDuration) * (height - this.claimStart);
      const expectedCurrentUsdtPriceAssetRatio = 100e6;
      const expectedUsdtPriceAssetAllowableRatio = 101e6;
      const expectedTotalPeriodAllowance = this.totalPeriodAllowance;
      const expectedUserPeriodAllowance = this.userPeriodAllowance;
      const expectedPeriodLenght = this.periodLength;
      const expectedUserTotalPriceAssetClaimed = 0;
      const expected = { type: 'String', value: `%d%d%d%d%d%d__${expectedUsdnAmount}__${expectedUserPeriodAllowance}__${expectedTotalPeriodAllowance}__${expectedUsdtPriceAssetAllowableRatio}__${expectedCurrentUsdtPriceAssetRatio}__${expectedPeriodLenght}__${expectedUserTotalPriceAssetClaimed}` };

      const expr = `claimV2READONLY(\"${this.usdnAssetId}\", \"${address(this.accounts.user1, chainId)}\")`; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(ido, expr);
      const checkData = response.result.value._2.value;  /* eslint-disable-line */

      expect(checkData).to.eql(expected); /* eslint-disable-line */
    },
  );
});
