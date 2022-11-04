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

describe('lp: putRejectIfInvalidPriceOrAmount.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject put', async function () {
    const shibAmount = 10e2;
    const shouldAutoStake = false;

    const expectedRejectMessage = 'Invalid amt or price asset passed.';

    const lp = address(this.accounts.lp, chainId);

    const put = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount },
        { assetId: this.shibAssetId, amount: shibAmount },
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

    await expect(
      api.transactions.broadcast(put, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
    );
  });
});
