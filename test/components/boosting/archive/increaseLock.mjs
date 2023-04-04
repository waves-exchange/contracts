import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  data,
  transfer,
  reissue,
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: increaseLock.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully increaseLock',
    async function () {
      const deltaDuration = this.minDuration + 1;
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const referrer = '';
      const signature = 'base64:';

      const expectedActiveTotalLocked = 1e9;
      const expectedGwxCachedTotal = 500000470;
      const expectedInvokesCount = 2;
      const expectedGWxAmountStart = 710;
      const expectedLockDurationNew = 3;

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
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
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
      await broadcastAndWait(lockRefTx);

      const setLockTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: `%s%s__lock__${address(this.accounts.user0, chainId)}`,
            type: 'string',
            value: '%d%d%d%d%d%d%d%d__0__0__0__0__0__0__0__0',
          },
        ],
        chainId,
      }, this.accounts.boosting.seed);
      await broadcastAndWait(setLockTx);

      const increaseLockTx = invokeScript({
        dApp: address(this.accounts.boosting, chainId),
        payment: [
          { assetId: this.wxAssetId, amount: assetAmount },
        ],
        call: {
          function: 'increaseLock',
          args: [
            { type: 'integer', value: deltaDuration },
          ],
        },
        chainId,
      }, this.accounts.user0.seed);
      const { id, height, stateChanges } = await broadcastAndWait(increaseLockTx);
      const { timestamp } = await api.blocks.fetchHeadersAt(height);

      expect(stateChanges.data).to.eql([{
        key: '%s%d%s__paramByUserNum__0__amount',
        type: 'integer',
        value: assetAmount,
      }, {
        key: '%s%d%s__paramByUserNum__0__start',
        type: 'integer',
        value: height,
      }, {
        key: '%s%d%s__paramByUserNum__0__duration',
        type: 'integer',
        value: deltaDuration,
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
        value: `%d%d%d%d%d%d%d%d__0__${assetAmount}__${height}__${deltaDuration}__0__0__${timestamp}__0`,
      }, {
        key: '%s%s__stats__locksDurationSumInBlocks',
        type: 'integer',
        value: duration + deltaDuration,
      }, {
        key: '%s%s__stats__locksCount',
        type: 'integer',
        value: 1,
      }, {
        key: '%s%s__stats__activeUsersCount',
        type: 'integer',
        value: 1,
      }, {
        key: '%s%s__stats__activeTotalLocked',
        type: 'integer',
        value: expectedActiveTotalLocked,
      }, {
        key: `%s%s%s%s__history__lock__${address(this.accounts.user0, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d%d%d%d__${height}__${timestamp}__${assetAmount}__0__${deltaDuration}__0__0`,
      }, {
        key: '%s%s__gwxCached__total',
        type: 'integer',
        value: expectedGwxCachedTotal,
      }]);

      const { invokes } = stateChanges;
      expect(invokes.length).to.eql(expectedInvokesCount);

      expect(invokes[0].dApp).to.eql(address(this.accounts.mathContract, chainId));
      expect(invokes[0].call.function).to.eql('updateReferralActivity');
      expect(invokes[0].call.args).to.eql([
        {
          type: 'String',
          value: address(this.accounts.user0, chainId),
        }, {
          type: 'Int',
          value: expectedGWxAmountStart,
        }]);

      expect(invokes[1].dApp).to.eql(address(this.accounts.mathContract, chainId));
      expect(invokes[1].call.function).to.eql('calcGwxParamsREADONLY');
      expect(invokes[1].call.args).to.eql([
        {
          type: 'Int',
          value: expectedGWxAmountStart,
        }, {
          type: 'Int',
          value: height,
        }, {
          type: 'Int',
          value: expectedLockDurationNew,
        }]);
    },
  );
});
