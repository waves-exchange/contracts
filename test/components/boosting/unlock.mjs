import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  transfer,
  reissue,
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait, waitForHeight } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: unlock.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully unlock',
    async function () {
      const duration = 3;
      const assetAmount = this.minLockAmount;

      const expectedLocksCount = 1;

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

      const lockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'lock',
          args: [
            { type: 'integer', value: duration },
          ],
        },
        chainId,
      }, this.accounts.user0.seed);
      const { height } = await broadcastAndWait(lockTx);

      const expectedLockStart = height;

      await waitForHeight(height + duration + 1);

      const unlockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [],
        call: {
          function: 'unlock',
          args: [
            { type: 'string', value: address(this.accounts.user0, chainId) },
          ],
        },
        chainId,
      }, this.accounts.user0.seed);
      const {
        id,
        height: heightUnlock,
        stateChanges,
      } = await broadcastAndWait(unlockTx);

      const expectedTimestamp = (await api.blocks.fetchHeadersAt(heightUnlock)).timestamp;

      expect(stateChanges.data).to.eql([{
        key: '%s%d%s__paramByUserNum__0__amount',
        type: 'integer',
        value: 0,
      }, {
        key: '%s%d%s__paramByUserNum__0__start',
        type: 'integer',
        value: height,
      }, {
        key: '%s%d%s__paramByUserNum__0__duration',
        type: 'integer',
        value: duration,
      }, {
        key: '%s%d%s__paramByUserNum__0__k',
        type: 'integer',
        value: 0,
      }, {
        key: '%s%d%s__paramByUserNum__0__b',
        type: 'integer',
        value: 0,
      }, {
        key: '%s%d%s%d__paramByPeriod__0__k__0',
        type: 'integer',
        value: 0,
      }, {
        key: '%s%d%s%d__paramByPeriod__0__b__0',
        type: 'integer',
        value: 0,
      }, {
        key: `%s%s__lock__${address(this.accounts.user0, chainId)}`,
        type: 'string',
        value: `%d%d%d%d%d%d%d%d__0__0__${height}__${duration}__0__0__${expectedTimestamp}__0`,
      }, {
        key: '%s%s__stats__locksDurationSumInBlocks',
        type: 'integer',
        value: duration,
      }, {
        key: '%s%s__stats__locksCount',
        type: 'integer',
        value: expectedLocksCount,
      }, {
        key: '%s%s__stats__activeUsersCount',
        type: 'integer',
        value: 0,
      }, {
        key: '%s%s__stats__activeTotalLocked',
        type: 'integer',
        value: 0,
      }, {
        key: `%s%s%s%s__history__unlock__${address(this.accounts.user0, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d%d%d%d__${heightUnlock}__${expectedTimestamp}__${assetAmount}__${expectedLockStart}__${duration}__0__0`,
      }]);
    },
  );
});
