import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  data,
  transfer,
  reissue,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: gwxUserInfoREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully gwxUserInfoREADONLY',
    async function () {
      const k = 1000;
      const b = 10;

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

      const setKTx = data({
        additionalFee: 4e5,
        data: [{
          key: '%s%d%s__paramByUserNum__0__k',
          type: 'integer',
          value: k,
        }],
        chainId,
      }, this.accounts.boosting.seed);
      await broadcastAndWait(setKTx);

      const setBTx = data({
        additionalFee: 4e5,
        data: [{
          key: '%s%d%s__paramByUserNum__0__b',
          type: 'integer',
          value: b,
        }],
        chainId,
      }, this.accounts.boosting.seed);
      const { height } = await broadcastAndWait(setBTx);

      const expectedGwxAmount = Math.floor((k * height + b) / 1000);

      const expr = `gwxUserInfoREADONLY(\"${this.accounts.user0.addr}\")`; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(
        this.accounts.boosting.addr,
        expr,
      );
      const checkData = response.result.value._2.value; /* eslint-disable-line */

      // TODO: check all checkData
      expect(checkData[0]).to.eql({
        type: 'Int',
        value: expectedGwxAmount,
      });
    },
  );
});
