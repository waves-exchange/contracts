import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait, waitForHeight,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_leasing: claim unlocked', /** @this {MochaSuiteModified} */() => {
  const periodLength = 2;
  const leaseAmount = 10e8;
  const cancelAmount = 10e7;
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

      const leaseTx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'lease',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: leaseAmount },
        ],
        chainId,
      }, this.accounts.user1.seed);

      const cancelLeaseTx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'cancelLease',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          },
          {
            type: 'integer',
            value: cancelAmount,
          }],
        },
        chainId,
      }, this.accounts.user1.seed);

      const { height: startHeight } = await broadcastAndWait(setPeriodLengthTx);
      await broadcastAndWait(leaseTx);
      await broadcastAndWait(cancelLeaseTx);
      periodStart = startHeight;
    },
  );

  it(
    'should not be able to claim unlocked in current period',
    async function () {
      const claimTx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'claimAll',
        },
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(claimTx)).to.be.rejectedWith('nothing to claim');
    },
  );

  it(
    'should be able to claim unlocked',
    async function () {
      const claimTx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'claimAll',
        },
        chainId,
      }, this.accounts.user1.seed);

      await waitForHeight(periodStart + periodLength);
      const { stateChanges } = await broadcastAndWait(claimTx);

      const currentPeriod = periodStart + periodLength;
      const nextPeriod = periodStart + 2 * periodLength;

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s%s__toClaim__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%d%d%d%d__${currentPeriod}__0__${nextPeriod}__0`,
        },
      ]);
      expect(stateChanges.transfers).to.be.deep.equal([
        {
          address: this.accounts.user1.addr,
          amount: cancelAmount,
          asset: this.l2mpAssetId,
        },
      ]);
    },
  );
});
