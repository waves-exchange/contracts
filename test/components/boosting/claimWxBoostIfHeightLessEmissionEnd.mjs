import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  transfer,
  reissue,
  invokeScript,
} from '@waves/waves-transactions';

import { broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';
import { staking } from './contract/staking.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const chainId = 'R';

describe('boosting: claimWxBoostIfHeightLessEmissionEnd.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claimWxBoost',
    async function () {
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

      const { height: lockStartHeight } = await boosting.lock({
        dApp: this.accounts.boosting.addr,
        caller: this.accounts.user0.seed,
        duration: this.maxLockDuration,
        payments: [{ assetId: this.wxAssetId, amount: wxAmount }],
      });
      await waitForHeight(lockStartHeight + 1);

      const { height: stakeHeight } = await staking.stake({
        dApp: this.accounts.staking.addr,
        caller: this.accounts.user0.seed,
        payments: [{ assetId: this.lpAssetId, amount: lpAssetAmount }],
      });
      await waitForHeight(stakeHeight + 1);

      const claimWxBoostTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [],
        call: {
          function: 'claimWxBoost',
          args: [
            { type: 'string', value: this.lpAssetId },
            { type: 'string', value: this.accounts.user0.addr },
          ],
        },
        chainId,
      }, this.accounts.staking.seed);
      const { stateChanges } = await broadcastAndWait(claimWxBoostTx);

      expect(stateChanges.data).to.eql([
        {
          key: `%s%d__userBoostEmissionLastIntV2__0__${this.lpAssetId}`,
          type: 'integer',
          value: 0,
        },
        {
          key: `%s%s%s%d__voteStakedIntegralLast__${this.lpAssetId}__${this.accounts.user0.addr}__0`,
          type: 'integer',
          value: 0,
        },
        {
          key: `%s%s%s%d__votingResultStakedIntegralLast__${this.lpAssetId}__${this.accounts.user0.addr}__0`,
          type: 'integer',
          value: 0,
        },
      ]);
    },
  );
});
