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
  const lockedAmount1 = 654321;

  before(
    async function () {
      const stakeTx1 = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'stakeAndSetStakingNode',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          }],
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

      const airdropTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'airdrop',
          args: [{
            type: 'list',
            value: [
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
            ],
          },
          {
            type: 'list',
            value: [
              {
                type: 'integer',
                value: lockedAmount1,
              },
            ],
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: lockedAmount1 },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      await broadcastAndWait(stakeTx1);
      await broadcastAndWait(stakeTx2);
      await broadcastAndWait(airdropTx);
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
          _3: { type: 'BigInt', value: `${10e17}` },
          _4: { type: 'Int', value: stakeAmount1 },
          _5: { type: 'Int', value: 0 },
          _6: { type: 'Int', value: lockedAmount1 },
          _7: { type: 'Int', value: lockedAmount1 },
          _8: {
            type: 'Array',
            value: [
              { type: 'String', value: this.accounts.node1.addr },
            ],
          },
          _9: {
            type: 'Array',
            value: [
              { type: 'Int', value: 100 },
            ],
          },
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
          _1: { type: 'Int', value: stakeAmount1 + stakeAmount2 + lockedAmount1 },
          _2: { type: 'Int', value: stakeAmount1 + stakeAmount2 + lockedAmount1 },
          _3: { type: 'BigInt', value: `${10e17}` },
          _4: { type: 'Int', value: lockedAmount1 },
          _5: { type: 'Int', value: lockedAmount1 },
        },
      });
    },
  );
});
