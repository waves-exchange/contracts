import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  api, chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: get staked info', /** @this {MochaSuiteModified} */() => {
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

      await broadcastAndWait(stakeTx1);
      await broadcastAndWait(stakeTx2);
    },
  );

  it(
    'getUserAssetsREADONLY should return correct values',
    async function () {
      const expr = `getUserAssetsREADONLY("${this.accounts.user1.addr}")`;
      const response = await api.utils.fetchEvaluate(
        this.accounts.l2mpStaking.addr,
        expr,
      );
      const checkData = response.result.value._2;

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
      const expr = 'getTotalAssetsREADONLY()';
      const response = await api.utils.fetchEvaluate(
        this.accounts.l2mpStaking.addr,
        expr,
      );
      const checkData = response.result.value._2;

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
