import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';

import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';
const api = create(apiBase);

describe('lp_stable: calculateAmountOutForSwapAndSendTokens.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully calculateAmountOutForSwapAndSendTokens', async function () {
    const usdnAmount = 10e8;
    const usdtAmount = 10e8;
    const shouldAutoStake = false;

    const expected1 = {
      address: address(this.accounts.user1, chainId),
      amount: 29996411,
      asset: this.usdnAssetId,
    };

    const lpStable = address(this.accounts.lpStable, chainId);
    const swapAmount = 30e6;
    const feePoolAmount = 3e6;

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

    const invokeTx = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: swapAmount },
      ],
      call: {
        function: 'calculateAmountOutForSwapAndSendTokens',
        args: [
          { type: 'integer', value: swapAmount },
          { type: 'boolean', value: false },
          { type: 'integer', value: 0 },
          { type: 'string', value: address(this.accounts.user1, chainId) },
          { type: 'integer', value: feePoolAmount },
        ],
      },
      chainId,
    }, this.accounts.swap);
    await api.transactions.broadcast(invokeTx, {});
    const { stateChanges } = await ni.waitForTx(invokeTx.id, { apiBase });

    expect(stateChanges).to.deep.nested.include({"transfers": [expected1]}); /* eslint-disable-line */
  });
});
