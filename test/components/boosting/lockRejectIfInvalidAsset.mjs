import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  transfer,
  reissue,
  issue,
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: lockRejectIfInvalidAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject lockRef', async function () {
    const someIssueTx = issue({
      name: 'Some Token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed);
    await broadcastAndWait(someIssueTx);
    const invalidAssetId = someIssueTx.id;

    const someAmount = 1e8;
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: someAmount,
      assetId: invalidAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    const duration = 0;
    const referrer = '';
    const signature = 'base64:';

    const expectedRejectMessage = `invalid asset is in payment - ${this.wxAssetId} is expected`;

    const lpAssetAmount = 1e3 * 1e8;
    const wxAmount = 1e3 * 1e8;

    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: wxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    const lpAssetIssueTx = reissue({
      assetId: this.lpAssetId,
      quantity: lpAssetAmount * 10,
      reissuable: true,
      chainId,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetIssueTx);

    const lpAssetTransferTx = transfer({
      recipient: this.accounts.user0.addr,
      amount: lpAssetAmount,
      assetId: this.lpAssetId,
      additionalFee: 4e5,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetTransferTx);

    const lockRefTx = invokeScript({
      dApp: this.accounts.boosting.addr,
      payment: [
        { assetId: invalidAssetId, amount: 1 },
      ],
      call: {
        function: 'lockRef',
        args: [
          { type: 'integer', value: duration },
          { type: 'string', value: referrer },
          { type: 'binary', value: signature },
        ],
      },
      chainId,
    }, this.accounts.user0.seed);

    await expect(
      api.transactions.broadcast(lockRefTx, {}),
    ).to.be.rejectedWith(
      `Error while executing dApp: boosting.ride: ${expectedRejectMessage}`,
    );
  });
});
