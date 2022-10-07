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

describe('lp: putRejectIfExceededPassedLimitOf.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject put', async function () {
    const usdnAmount = 10e6;
    const shibAmount = 10e2;
    const shouldAutoStake = false;

    const expectedRejectMessage = 'Price slippage 500000000000000000 exceeded the passed limit of 0';

    const lp = address(this.accounts.lp, chainId);

    const put = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount },
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

    const putSecond = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount },
        { assetId: this.usdnAssetId, amount: usdnAmount / 2 },
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
      api.transactions.broadcast(putSecond, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
    );
  });
});
