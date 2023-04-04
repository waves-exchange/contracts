import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  transfer,
  reissue,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: lock.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully lock',
    async function () {
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;

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

      const { id, height, stateChanges } = await broadcastAndWait(lockTx);

      const expectedTimestamp = (await api.blocks.fetchHeadersAt(height)).timestamp;
      const expectedNextUserNum = 1;
      const expectedUserNumStr = '0';
      const expectedUserNum = 0;
      const expectedK = 0;
      const expectedB = 0;
      const expectedPeriod = 0;
      const expectedGwxAmount = 0;
      const expectedLocksDurationSumInBlock = duration;
      const expectedLocksCount = 1;
      const expectedActiveUsersCount = 1;
      const expectedActiveTotalLocked = assetAmount;
      const expectedLockStart = height;
      const expectedUserBoostEmissionLastIntegralKEY = 0;
      const expectedTotalCachedGwxKEY = 499999760;
      const expectedInvokesCount = 2;

      expect(stateChanges.data).to.eql([{
        key: '%s__nextUserNum',
        type: 'integer',
        value: expectedNextUserNum,
      }, {
        key: `%s%s%s__mapping__user2num__${address(this.accounts.user0, chainId)}`,
        type: 'string',
        value: expectedUserNumStr,
      }, {
        key: `%s%s%s__mapping__num2user__${expectedUserNum}`,
        type: 'string',
        value: address(this.accounts.user0, chainId),
      }, {
        key: `%s%d%s__paramByUserNum__${expectedUserNum}__amount`,
        type: 'integer',
        value: assetAmount,
      }, {
        key: `%s%d%s__paramByUserNum__${expectedUserNum}__start`,
        type: 'integer',
        value: height,
      }, {
        key: `%s%d%s__paramByUserNum__${expectedUserNum}__duration`,
        type: 'integer',
        value: duration,
      }, {
        key: `%s%d%s__paramByUserNum__${expectedUserNum}__k`,
        type: 'integer',
        value: expectedK,
      }, {
        key: `%s%d%s__paramByUserNum__${expectedUserNum}__b`,
        type: 'integer',
        value: expectedB,
      }, {
        key: `%s%d%s%d__paramByPeriod__${expectedUserNum}__k__${expectedPeriod}`,
        type: 'integer',
        value: expectedK,
      }, {
        key: `%s%d%s%d__paramByPeriod__${expectedUserNum}__b__${expectedPeriod}`,
        type: 'integer',
        value: expectedB,
      }, {
        key: `%s%s__lock__${address(this.accounts.user0, chainId)}`,
        type: 'string',
        value: `%d%d%d%d%d%d%d%d__${expectedUserNum}__${assetAmount}__${height}__${duration}__${expectedK}__${expectedB}__${expectedTimestamp}__${expectedGwxAmount}`,
      }, {
        key: '%s%s__stats__locksDurationSumInBlocks',
        type: 'integer',
        value: expectedLocksDurationSumInBlock,
      }, {
        key: '%s%s__stats__locksCount',
        type: 'integer',
        value: expectedLocksCount,
      }, {
        key: '%s%s__stats__activeUsersCount',
        type: 'integer',
        value: expectedActiveUsersCount,
      }, {
        key: '%s%s__stats__activeTotalLocked',
        type: 'integer',
        value: expectedActiveTotalLocked,
      }, {
        key: `%s%s%s%s__history__lock__${address(this.accounts.user0, chainId)}__${id}`,
        type: 'string',
        value: `%d%d%d%d%d%d%d__${height}__${expectedTimestamp}__${assetAmount}__${expectedLockStart}__${duration}__${expectedK}__${expectedB}`,
      }, {
        key: `%s%d__userBoostEmissionLastInt__${expectedUserNum}`,
        type: 'integer',
        value: expectedUserBoostEmissionLastIntegralKEY,
      }, {
        key: '%s%s__gwxCached__total',
        type: 'integer',
        value: expectedTotalCachedGwxKEY,
      }]);

      const { invokes } = stateChanges;
      expect(invokes.length).to.eql(expectedInvokesCount);

      expect(invokes[0].dApp).to.eql(address(this.accounts.mathContract, chainId));
      expect(invokes[0].call.function).to.eql('calcGwxParamsREADONLY');
      expect(invokes[0].call.args).to.eql([
        {
          type: 'Int',
          value: expectedTotalCachedGwxKEY,
        }, {
          type: 'Int',
          value: height,
        }, {
          type: 'Int',
          value: duration,
        }]);

      expect(invokes[1].dApp).to.eql(address(this.accounts.mathContract, chainId));
      expect(invokes[1].call.function).to.eql('updateReferralActivity');
      expect(invokes[1].call.args).to.eql([
        {
          type: 'String',
          value: address(this.accounts.user0, chainId),
        }, {
          type: 'Int',
          value: expectedTotalCachedGwxKEY,
        }]);
    },
  );
});
