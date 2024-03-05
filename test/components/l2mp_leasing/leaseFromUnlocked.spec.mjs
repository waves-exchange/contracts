import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait, waitForHeight,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_leasing: lease', /** @this {MochaSuiteModified} */() => {
  const periodLength = 2;
  const initLeaseAmount = 10e8;
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
          { assetId: this.l2mpAssetId, amount: initLeaseAmount },
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
    'should be able to lease from locked amount',
    async function () {
      const leaseAmount = cancelAmount / 2;
      const leaseFromLockedTx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'leaseFromLocked',
          args: [{
            type: 'string',
            value: this.accounts.node2.addr,
          }, {
            type: 'integer',
            value: leaseAmount,
          }],
        },
        chainId,
      }, this.accounts.user1.seed);

      await waitForHeight(periodStart + periodLength);
      const { stateChanges, height } = await broadcastAndWait(leaseFromLockedTx);

      const currentPeriod = periodStart + periodLength;
      const nextPeriod = periodStart + 2 * periodLength;

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s__${this.accounts.node2.addr}`,
          type: 'string',
          value: `%d%d%d%d__${currentPeriod}__0__${nextPeriod}__${leaseAmount}`,
        },
        {
          key: `%s%s__${this.accounts.node2.addr}__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%d%d%d%d__${currentPeriod}__0__${nextPeriod}__${leaseAmount}`,
        },
        {
          key: `%s%s__toClaim__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%d%d%d%d__${currentPeriod}__${cancelAmount - leaseAmount}__${nextPeriod}__0`,
        },
        {
          key: `%s%s__userTotalLocked__${this.accounts.user1.addr}`,
          type: 'integer',
          value: initLeaseAmount - cancelAmount + leaseAmount,
        },
        {
          key: `%s%d__${this.accounts.node2.addr}__${height}`,
          type: 'integer',
          value: leaseAmount,
        },
        {
          key: `%s%s%d__${this.accounts.node2.addr}__${this.accounts.user1.addr}__${height}`,
          type: 'integer',
          value: leaseAmount,
        },
      ]);
    },
  );
});
