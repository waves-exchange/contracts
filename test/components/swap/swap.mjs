import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('swap: swap.mjs', /** @this {MochaSuiteModified} */ () => {
  it('should successfully put with shouldAutoStake false', async function () {
    const usdnAmount = 10e6;
    const usdtAmount = 10e6;
    const swapUsdnAmount = 1000;
    const shouldAutoStake = false;

    const lpStable = address(this.accounts.lpStable, chainId);
    const swap = address(this.accounts.swap, chainId);

    const put = invokeScript(
      {
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
      },
      this.accounts.user1,
    );
    await api.transactions.broadcast(put, {});
    await ni.waitForTx(put.id, { apiBase });

    const swapTx = invokeScript(
      {
        dApp: swap,
        payment: [{ assetId: this.usdtAssetId, amount: usdtAmount }],
        call: {
          function: 'swap',
          args: [
            { type: 'integer', value: swapUsdnAmount },
            { type: 'string', value: this.usdnAssetId },
            { type: 'string', value: address(this.accounts.user1, chainId) },
          ],
        },
        chainId,
      },
      this.accounts.user1,
    );
    await api.transactions.broadcast(swapTx, {});
    await ni.waitForTx(swapTx.id, { apiBase });

    // TODO: check swap result
  });
});
