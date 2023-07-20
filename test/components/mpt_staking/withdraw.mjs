import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import {
  api, apiBase, chainId, waitForHeight, waitForTx,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('mrt_staking: withdraw tokens', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to withdraw with profit',
    async function () {
      // There is 2 Stakers

      const stakeAmount = 10e8;
      const expectedLpAmount = 10e8;
      const expectedWithdrawAmount = stakeAmount + (this.emissionPerBlock / 2);

      const stakeTx = invokeScript({
        dApp: this.accounts.mptStaking.addr,
        call: {
          function: 'stake',
        },
        payment: [
          { assetId: this.mptAssetId, amount: stakeAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const stakeForTx = invokeScript({
        dApp: this.accounts.mptStaking.addr,
        call: {
          function: 'stakeFor',
          args: [{
            type: 'string',
            value: this.accounts.user2.addr,
          }],
        },
        payment: [
          { assetId: this.mptAssetId, amount: stakeAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      await api.transactions.broadcast(stakeForTx, {});
      await api.transactions.broadcast(stakeTx, {});
      const startHeight = await ni.currentHeight(apiBase);
      await waitForTx(stakeForTx.id);
      await waitForTx(stakeTx.id);

      await waitForHeight(startHeight + 1);

      const withdrawTx = invokeScript({
        dApp: this.accounts.mptStaking.addr,
        call: {
          function: 'withdraw',
          args: [{
            type: 'integer',
            value: stakeAmount,
          }],
        },
        payment: [
          { assetId: this.mptAssetId, amount: stakeAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      await api.transactions.broadcast(withdrawTx, {});
      const { stateChanges } = await waitForTx(withdrawTx.id);

      expect(stateChanges.transfers).to.be.deep.equal([
        {
          address: this.accounts.user1.addr,
          asset: this.mptAssetId,
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
          value: startHeight + 1,
        },
      ]);
    },
  );
});
