import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import {
  data, invokeScript, libs, nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: lockRefIfUserIsExisting.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully lockRef if userIsExisting',
    async function () {
      const duration = this.maxDuration - 1;
      const referrer = address(this.accounts.referrer, chainId);
      const bytes = libs.crypto.stringToBytes('dummySignature');
      const signature = libs.crypto.signBytes(this.accounts.user1, bytes);
      const assetAmount = this.minLockAmount;
      const user2num = '0';
      const paramByUserNumStart = 0;
      const paramByUserNumDuration = 0;

      console.log(`%s%s%s__mapping__user2num__${address(this.accounts.user1, chainId)}`);

      const setUser2numTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: `%s%s%s__mapping__user2num__${address(this.accounts.user1, chainId)}`,
            type: 'string',
            value: user2num,
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setUser2numTx, {});
      await ni.waitForTx(setUser2numTx.id, { apiBase });

      const setStartTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: '%s%d%s__paramByUserNum__0__start',
            type: 'integer',
            value: paramByUserNumStart,
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setStartTx, {});
      await ni.waitForTx(setStartTx.id, { apiBase });

      const setDurationTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: '%s%d%s__paramByUserNum__0__duration',
            type: 'integer',
            value: paramByUserNumDuration,
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setDurationTx, {});
      await ni.waitForTx(setDurationTx.id, { apiBase });

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
            { type: 'string', value: signature },
          ],
        },
        chainId,
      }, this.accounts.user1);
      await api.transactions.broadcast(lockRefTx, {});
      const { id, height, stateChanges } = await ni.waitForTx(lockRefTx.id, { apiBase });

      const expectedTimestamp = (await api.blocks.fetchHeadersAt(height)).timestamp;
      const expectedUserNum = 0;
      const expectedK = 0;
      const expectedB = 0;
      const expectedPeriod = 0;
      const expectedGwxAmount = 0;
      const expectedLocksDurationSumInBlock = duration;
      const expectedLocksCount = 1;
      const expectedActiveUsersCount = 0;
      const expectedActiveTotalLocked = assetAmount;
      const expectedLockStart = height;
      const expectedUserBoostEmissionLastIntegralKEY = 0;
      const expectedTotalCachedGwxKEY = 499999760;
      const expectedInvokesCount = 3;

      expect(stateChanges.data).to.eql([{
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
        key: `%s%s__lock__${address(this.accounts.user1, chainId)}`,
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
        key: `%s%s%s%s__history__lock__${address(this.accounts.user1, chainId)}__${id}`,
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

      expect(invokes[0].dApp).to.eql(address(this.accounts.referralProgram, chainId));
      expect(invokes[0].call.function).to.eql('createPair');
      expect(invokes[0].call.args).to.eql([
        {
          type: 'String',
          value: 'wxlock',
        }, {
          type: 'String',
          value: address(this.accounts.referrer, chainId),
        }, {
          type: 'String',
          value: address(this.accounts.user1, chainId),
        }, {
          type: 'String',
          value: signature,
        }]);

      expect(invokes[1].dApp).to.eql(address(this.accounts.mathContract, chainId));
      expect(invokes[1].call.function).to.eql('calcGwxParamsREADONLY');
      expect(invokes[1].call.args).to.eql([
        {
          type: 'Int',
          value: expectedTotalCachedGwxKEY,
        }, {
          type: 'Int',
          value: height,
        }, {
          type: 'Int',
          value: expectedLocksDurationSumInBlock,
        }]);

      expect(invokes[2].dApp).to.eql(address(this.accounts.mathContract, chainId));
      expect(invokes[2].call.function).to.eql('updateReferralActivity');
      expect(invokes[2].call.args).to.eql([
        {
          type: 'String',
          value: address(this.accounts.user1, chainId),
        }, {
          type: 'Int',
          value: expectedTotalCachedGwxKEY,
        }]);
    },
  );
});
