import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import {
  api, apiBase, chainId, waitForHeight, waitForTx,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: withdraw tokens', /** @this {MochaSuiteModified} */() => {
  // There are 2 stakers
  const emissionPerBlock = 5e6;
  const stakeAmount = 10e8;
  const expectedLpAmount = 10e8;
  const blocksCount = 2;
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

      await api.transactions.broadcast(setEmissionTx, {});
      await waitForTx(setEmissionTx.id);
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

      const startHeight = await ni.currentHeight(apiBase);
      await api.transactions.broadcast(stakeForTx, {});
      await api.transactions.broadcast(stakeTx, {});
      // const a = await waitForTx(stakeTx.id);

      // const startHeight = a.height;
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

      await api.transactions.broadcast(withdrawTx, {});
      const { stateChanges } = await waitForTx(withdrawTx.id);

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
