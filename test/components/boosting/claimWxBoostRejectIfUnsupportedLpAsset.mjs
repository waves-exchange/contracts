import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  transfer,
  reissue,
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: claimWxBoostRejectIfUnsupportedLpAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject claimWxBoost',
    async function () {
      const lpAssetAmount = 1e3 * 1e8;
      const wxAmount = 1e3 * 1e8;

      const someNonExistentLpAssetId = 'lpAssetId';
      const expectedRejectMessage = 'unsupported lp asset lpAssetId';

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

      const { height: lockStartHeight } = await boosting.lock({
        dApp: this.accounts.boosting.addr,
        caller: this.accounts.user0.seed,
        duration: this.maxLockDuration,
        payments: [{ assetId: this.wxAssetId, amount: wxAmount }],
      });
      await waitForHeight(lockStartHeight + 1);

      const claimWxBoostTx = invokeScript({
        dApp: this.accounts.boosting.addr,
        payment: [],
        call: {
          function: 'claimWxBoost',
          args: [
            { type: 'string', value: someNonExistentLpAssetId },
            { type: 'string', value: this.accounts.user0.addr },
          ],
        },
        chainId,
      }, this.accounts.staking.seed);

      await expect(
        api.transactions.broadcast(claimWxBoostTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: boosting.ride: ${expectedRejectMessage}`,
      );
    },
  );
});
