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

describe('lp_stable: putRejectAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject if asset is invalid', async function () {
    const usdnAmount = 1e16 / 10;
    const usdtAmount = 1e8 / 10;
    const shouldAutoStake = false;

    const lpStable = address(this.accounts.lpStable, chainId);

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

    // console.log(this.otherAssetId);

    const putOther = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.otherAssetId, amount: 1234 },
        { assetId: this.otherAssetId, amount: 1234 },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: 1000000000 },
          { type: 'boolean', value: shouldAutoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);

    return expect(api.transactions.broadcast(putOther, {})).to.be.rejectedWith('Invalid amt or price asset passed.');
  });
});
