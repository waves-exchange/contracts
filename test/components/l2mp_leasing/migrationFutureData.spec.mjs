import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data } from '@waves/waves-transactions';
import {
  api, chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_leasing migration future', /** @this {MochaSuiteModified} */() => {
  const stakeAmount1 = 12345678;
  const stakeAmount2 = 54321;
  const periodLength = 100;
  const toUnlock1 = 4321;
  let periodStart;

  before(
    async function () {
      const totalStaked = stakeAmount1 + stakeAmount2;
      const { height: currentHeight } = await api.blocks.fetchHeight();
      periodStart = currentHeight + 100;
      const dataTx = data({
        data: [
          {
            key: '%s__offsetHeight',
            type: 'integer',
            value: Number(periodStart),
          },
          {
            key: '%s__periodLength',
            type: 'integer',
            value: Number(periodLength),
          },
          {
            key: `%s__${this.accounts.node1.addr}`,
            type: 'string',
            value: `%d%d%d%d__0__${totalStaked}__0__${totalStaked}`,
          },
          {
            key: `%s%s__${this.accounts.node1.addr}__${this.accounts.user1.addr}`,
            type: 'string',
            value: `%d%d%d%d__0__${stakeAmount1}__0__${stakeAmount1}`,
          },
          {
            key: `%s%s__toClaim__${this.accounts.user1.addr}`,
            type: 'string',
            value: `%d%d%d%d__0__0__0__${toUnlock1}`,
          },
          {
            key: `%s%s__userTotalLocked__${this.accounts.user1.addr}`,
            type: 'integer',
            value: Number(stakeAmount1),
          },
          {
            key: `%s%s__${this.accounts.node1.addr}__${this.accounts.user2.addr}`,
            type: 'string',
            value: `%d%d%d%d__0__${stakeAmount2}__0__${stakeAmount2}`,
          },
          {
            key: `%s%s__userTotalLocked__${this.accounts.user2.addr}`,
            type: 'integer',
            value: Number(stakeAmount2),
          },
        ],
        chainId,
        additionalFee: 400000,
      }, this.accounts.l2mpLeasing.seed);

      await broadcastAndWait(dataTx);
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
          _1: { type: 'Int', value: 0 },
          _2: { type: 'Int', value: stakeAmount1 },
          _3: { type: 'Int', value: 0 },
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
          _1: { type: 'Int', value: 0 },
          _2: { type: 'Int', value: stakeAmount1 + stakeAmount2 },
          _3: { type: 'Int', value: 0 },
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
          _1: { type: 'Int', value: 0 },
          _2: { type: 'Int', value: 0 },
          _3: { type: 'Int', value: 0 },
          _4: { type: 'Int', value: toUnlock1 },
          _5: { type: 'Int', value: stakeAmount1 },
          _6: { type: 'Int', value: currentHeight },
        },
      });
    },
  );
});
