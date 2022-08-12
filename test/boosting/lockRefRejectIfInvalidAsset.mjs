import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, massTransfer, waitForTx,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: lockRefReferrerAddressIsEmpty.mjs', /** @this {MochaSuiteModified} */() => {
  const seed = 'waves private node seed with waves tokens';
  let boosting;
  let wxAssetId;
  let invalidAssetId;
  let user1;

  before(async function () {
    boosting = this.accounts.boosting;
    user1 = this.accounts.user1;
    wxAssetId = this.wxAssetId;

    const someIssueTx = issue({
      name: 'Some Token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(someIssueTx, {});
    await waitForTx(someIssueTx.id, { apiBase });
    invalidAssetId = someIssueTx.id;

    const someAmount = 1e16;
    const massTransferTxWX = massTransfer({
      transfers: [{ recipient: address(user1, chainId), amount: someAmount }],
      assetId: invalidAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });
  });
  it(
    'should reject lockRef',
    async () => {
      const duration = 0;
      const referrer = '';
      const signature = 'base64:';

      const expectedRejectMessage = `invalid asset is in payment - ${wxAssetId} is expected`;

      const lockRefTx = invokeScript({
        dApp: address(boosting, chainId),
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
      }, user1);

      await expect(
        api.transactions.broadcast(lockRefTx, {}),
      ).to.be.rejectedWith(
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
