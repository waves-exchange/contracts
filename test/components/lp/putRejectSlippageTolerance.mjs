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

describe('lp: putRejectSlippageTolerance.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject put with negative slippageTolerance', async function () {
    const usdnAmount = 10e6;
    const shibAmount = 10e2;
    const slippageTolerance = -1;

    const expectedRejectMessage = 'Invalid slippageTolerance passed';

    const put = invokeScript({
      dApp: address(this.accounts.lp, chainId),
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount },
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

    await expect(
      api.transactions.broadcast(put, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
    );
  });
});
