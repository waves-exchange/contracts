import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, waitForHeight, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: withdraw tokens', /** @this {MochaSuiteModified} */() => {
  // There are 2 stakers
  const emissionPerBlock = 5e6;
  const stakeAmount = 10e8;
  const expectedLpAmount = 10e8;
  const blocksCount = 2;
  // TODO: sometimes contract returns 1004999999 instead of 1005000000
  const expectedWithdrawAmount = stakeAmount + ((emissionPerBlock / 2) * blocksCount);

  before(
    async function () {
      const setEmissionTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'setEmissionPerBlock',
          args: [{
            type: 'integer',
            value: emissionPerBlock,
          }],
        },
        additionalFee: 4e5,
        chainId,
      }, this.accounts.l2mpStaking.seed);

      await broadcastAndWait(setEmissionTx);
    },
  );

  it(
    'should be able to withdraw with profit',
    async function () {
      const stakeTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'stake',
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: stakeAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const stakeForTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'stakeFor',
          args: [{
            type: 'string',
            value: this.accounts.user2.addr,
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: stakeAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const [{ height: startHeight }] = await Promise.all([
        broadcastAndWait(stakeTx),
        broadcastAndWait(stakeForTx),
      ]);

      await waitForHeight(startHeight + blocksCount);

      const withdrawTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'withdraw',
          args: [{
            type: 'integer',
            value: expectedWithdrawAmount,
          }],
        },
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges } = await broadcastAndWait(withdrawTx);

      expect(stateChanges.transfers).to.be.deep.equal([
        {
          address: this.accounts.user1.addr,
          asset: this.l2mpAssetId,
          amount: expectedWithdrawAmount,
        },
      ]);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: '%s__totalLpAmount',
          type: 'integer',
          value: expectedLpAmount,
        },
        {
          key: '%s__totalAssetAmount',
          type: 'integer',
          value: expectedWithdrawAmount,
        },
        {
          key: `%s%s__userLpAmount__${this.accounts.user1.addr}`,
          type: 'integer',
          value: 0,
        },
        {
          key: `%s%s__totalAssetWithdrawn__${this.accounts.user1.addr}`,
          type: 'integer',
          value: expectedWithdrawAmount,
        },
        {
          key: '%s__startBlock',
          type: 'integer',
          value: startHeight + blocksCount,
        },
      ]);
    },
  );
});
