import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lpStable: putRejectSlippageTolerance.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject put with negative slippageTolerance', async function () {
    const usdnAmount = 1e16 / 10;
    const usdtAmount = 1e8 / 10;
    const slippageTolerance = -1;

    const put = invokeScript({
      dApp: address(this.accounts.lpStable, chainId),
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
        { assetId: this.usdnAssetId, amount: usdnAmount },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: slippageTolerance },
          { type: 'boolean', value: false },
        ],
      },
      chainId,
    }, this.accounts.user1);
    // await api.transactions.broadcast(put, {});
    await expect(api.transactions.broadcast(put, {})).to.be.rejectedWith(
      /^Error while executing dApp: Wrong slippage$/,
    );
  });
});
