import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import {
  data,
  invokeScript,
  nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

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
      }, this.accounts.user1);
      await api.transactions.broadcast(lockRefTx, {});
      await ni.waitForTx(lockRefTx.id, { apiBase });

      const setLockTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: `%s%s__lock__${address(this.accounts.user1, chainId)}`,
            type: 'string',
            value: `%d%d%d%d%d%d%d%d__0__${userAmount}__${lockEnd}__0__0__0__0__0`,
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setLockTx, {});
      await ni.waitForTx(setLockTx.id, { apiBase });

      const { value: config } = await api.addresses.fetchDataKey(
        address(this.accounts.boosting, chainId),
        '%s__config',
      );

      const configList = config.split('__');
      configList[3] = '-2';
      const newConfig = configList.join('__');

      const setConfigTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(this.accounts.boosting),
        data: [
          {
            key: '%s__config',
            type: 'string',
            value: newConfig,
          },
        ],
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setConfigTx, {});
      await ni.waitForTx(setConfigTx.id, { apiBase });

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
      }, this.accounts.user1);

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
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
