import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

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

describe('boosting: increaseLockRejectIfGwxDiffIsLessThenZero.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject increaseLock',
    async function () {
      const deltaDuration = 0;
      const duration = this.maxDuration - 1;
      const assetAmount = this.minLockAmount;
      const referrer = '';
      const signature = 'base64:';
      const userAmount = -10000000000000;
      const lockEnd = this.maxDuration - 1;

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
            key: `%s%s__lock__${this.accounts.user0.addr}`,
            type: 'string',
            value: `%d%d%d%d%d%d%d%d__0__${userAmount}__${lockEnd}__0__0__0__0__0`,
          },
        ],
        chainId,
      }, this.accounts.boosting.seed);
      await broadcastAndWait(setLockTx);

      const { value: config } = await api.addresses.fetchDataKey(
        this.accounts.boosting.addr,
        '%s__config',
      );

      const configList = config.split('__');
      configList[3] = '-2';
      const newConfig = configList.join('__');

      const setConfigTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: '%s__config',
            type: 'string',
            value: newConfig,
          },
        ],
        chainId,
      }, this.accounts.boosting.seed);
      await broadcastAndWait(setConfigTx);

      const increaseLockTx = invokeScript({
        dApp: this.accounts.boosting.addr,
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

      const { height: currentHeight } = await api.blocks.fetchHeight();
      const remainingDuration = lockEnd - currentHeight;
      const lockDurationNew = remainingDuration + deltaDuration;
      const MULT8 = 100000000;
      const coeffX8 = Math.floor((lockDurationNew * MULT8) / this.maxDuration);
      const userAmountNew = userAmount + this.minLockAmount;
      const expectedGwxDiff = Math.floor((userAmountNew * coeffX8) / MULT8);
      const expectedRejectMessage = `gwxDiff is less then 0: ${expectedGwxDiff}`;

      await expect(
        api.transactions.broadcast(increaseLockTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: boosting.ride: ${expectedRejectMessage}`,
      );
    },
  );
});
