import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  api, chainId, waitForTx,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('mrt_staking: get staked info', /** @this {MochaSuiteModified} */() => {
  const stakeAmount1 = 12345678;
  const stakeAmount2 = 2e8;

  before(
    async function () {
      const stakeTx1 = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'stake',
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: stakeAmount1 },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const stakeTx2 = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'stake',
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: stakeAmount2 },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user2.seed);

      await api.transactions.broadcast(stakeTx1, {});
      await api.transactions.broadcast(stakeTx2, {});
      await waitForTx(stakeTx1.id);
      await waitForTx(stakeTx2.id);
    },
  );

  it(
    'getUserAssetsREADONLY should return correct values',
    async function () {
      const expr = `getUserAssetsREADONLY(\"${this.accounts.user1.addr}\")`; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(
        this.accounts.l2mpStaking.addr,
        expr,
      );
      const checkData = response.result.value._2; /* eslint-disable-line */

      expect(checkData).to.eql({
        type: 'Tuple',
        value: {
          _1: { type: 'Int', value: stakeAmount1 },
          _2: { type: 'Int', value: stakeAmount1 },
          _3: { type: 'Int', value: 100000000 },
          _4: { type: 'Int', value: stakeAmount1 },
          _5: { type: 'Int', value: 0 },
        },
      });
    },
  );

  it(
    'getTotalAssetsREADONLY should return correct values',
    async function () {
      const expr = 'getTotalAssetsREADONLY()'; /* eslint-disable-line */
      const response = await api.utils.fetchEvaluate(
        this.accounts.l2mpStaking.addr,
        expr,
      );
      const checkData = response.result.value._2; /* eslint-disable-line */

      expect(checkData).to.eql({
        type: 'Tuple',
        value: {
          _1: { type: 'Int', value: stakeAmount1 + stakeAmount2 },
          _2: { type: 'Int', value: stakeAmount1 + stakeAmount2 },
          _3: { type: 'Int', value: 100000000 },
        },
      });
    },
  );
});
