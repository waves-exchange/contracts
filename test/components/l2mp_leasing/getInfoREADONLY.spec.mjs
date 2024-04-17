import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  api, chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_leasing READONLY func tests', /** @this {MochaSuiteModified} */() => {
  const stakeAmount1 = 12345678;
  const unstakeAmount1 = 111;
  const stakeAmount2 = 54321;
  const periodLength = 10;
  let periodStart;

  before(
    async function () {
      const setPeriodLengthTx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'setNewPeriodLength',
          args: [{
            type: 'integer',
            value: periodLength,
          }],
        },
        chainId,
      }, this.accounts.admin1.seed);

      const leaseUser1Tx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'lease',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          }],
        },
        payment: [{
          assetId: this.l2mpAssetId,
          amount: stakeAmount1 + unstakeAmount1,
        }],
        chainId,
      }, this.accounts.user1.seed);

      const unstakeUser1Tx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'cancelLease',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          }, {
            type: 'integer',
            value: unstakeAmount1,
          }],
        },
        chainId,
      }, this.accounts.user1.seed);

      const leaseUser2Tx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'lease',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          }],
        },
        payment: [{
          assetId: this.l2mpAssetId,
          amount: stakeAmount2,
        }],
        chainId,
      }, this.accounts.user2.seed);

      const { height: startHeight } = await broadcastAndWait(setPeriodLengthTx);
      periodStart = startHeight;
      await broadcastAndWait(leaseUser1Tx);
      await broadcastAndWait(unstakeUser1Tx);
      await broadcastAndWait(leaseUser2Tx);
    },
  );

  it(
    'getUserLeasingDataREADONLY should return correct values',
    async function () {
      const expr = `getUserLeasingDataREADONLY("${this.accounts.node1.addr}", "${this.accounts.user1.addr}")`;
      const { height: currentHeight } = await api.blocks.fetchHeight();
      const response = await api.utils.fetchEvaluate(
        this.accounts.l2mpLeasing.addr,
        expr,
      );
      const checkData = response.result.value._2;

      expect(checkData).to.eql({
        type: 'Tuple',
        value: {
          _1: { type: 'Int', value: periodStart },
          _2: { type: 'Int', value: 0 },
          _3: { type: 'Int', value: periodStart + periodLength },
          _4: { type: 'Int', value: stakeAmount1 },
          _5: { type: 'Int', value: currentHeight },
        },
      });
    },
  );

  it(
    'getNodeDataREADONLY should return correct values',
    async function () {
      const expr = `getNodeDataREADONLY("${this.accounts.node1.addr}")`;
      const { height: currentHeight } = await api.blocks.fetchHeight();
      const response = await api.utils.fetchEvaluate(
        this.accounts.l2mpLeasing.addr,
        expr,
      );
      const checkData = response.result.value._2;

      expect(checkData).to.eql({
        type: 'Tuple',
        value: {
          _1: { type: 'Int', value: periodStart },
          _2: { type: 'Int', value: 0 },
          _3: { type: 'Int', value: periodStart + periodLength },
          _4: { type: 'Int', value: stakeAmount1 + stakeAmount2 },
          _5: { type: 'Int', value: currentHeight },
        },
      });
    },
  );

  it(
    'getUserDataREADONLY should return correct values',
    async function () {
      const expr = `getUserDataREADONLY("${this.accounts.user1.addr}")`;
      const { height: currentHeight } = await api.blocks.fetchHeight();
      const response = await api.utils.fetchEvaluate(
        this.accounts.l2mpLeasing.addr,
        expr,
      );
      const checkData = response.result.value._2;

      expect(checkData).to.eql({
        type: 'Tuple',
        value: {
          _1: { type: 'Int', value: periodStart },
          _2: { type: 'Int', value: 0 },
          _3: { type: 'Int', value: periodStart + periodLength },
          _4: { type: 'Int', value: unstakeAmount1 },
          _5: { type: 'Int', value: stakeAmount1 },
          _6: { type: 'Int', value: currentHeight },
        },
      });
    },
  );
});
