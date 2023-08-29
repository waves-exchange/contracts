import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('swap: swapReadonly.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully put with shouldAutoStake false', async function () {
    const usdnAmount = 10e6;
    const usdtAmount = 10e6;
    const swapUsdnAmount = 1000;
    const shouldAutoStake = false;

    const lpStable = address(this.accounts.lpStable, chainId);
    const swap = address(this.accounts.swap, chainId);

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
    await ni.waitForTx(put.id, { apiBase });

    const expr = `swapCalculateREADONLY(${swapUsdnAmount}, \"${this.usdtAssetId}\", \"${this.usdnAssetId}\")`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(swap, expr);
    const checkData = response.result.value._2.value;  /* eslint-disable-line */

    // TODO: check checkData
  });
});
