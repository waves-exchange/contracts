import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_leasing: lease', /** @this {MochaSuiteModified} */() => {
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

      const { height: startHeight } = await broadcastAndWait(setPeriodLengthTx);
      periodStart = startHeight;
    },
  );

  it(
    'should be able to lease token',
    async function () {
      const leaseAmount = 10e8;

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

      const { stateChanges, height } = await broadcastAndWait(leaseTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s__${this.accounts.node1.addr}`,
          type: 'string',
          value: `%d%d%d%d__${periodStart}__0__${periodStart + periodLength}__${leaseAmount}`,
        },
        {
          key: `%s%s__${this.accounts.node1.addr}__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%d%d%d%d__${periodStart}__0__${periodStart + periodLength}__${leaseAmount}`,
        },
        {
          key: `%s%s__toClaim__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%d%d%d%d__${periodStart}__0__${periodStart + periodLength}__0`,
        },
        {
          key: `%s%s__userTotalLocked__${this.accounts.user1.addr}`,
          type: 'integer',
          value: leaseAmount,
        },
        {
          key: `%s%d__${this.accounts.node1.addr}__${height}`,
          type: 'integer',
          value: leaseAmount,
        },
        {
          key: `%s%s%d__${this.accounts.node1.addr}__${this.accounts.user1.addr}__${height}`,
          type: 'integer',
          value: leaseAmount,
        },
      ]);
    },
  );

  it(
    'should be able to lease for another user token',
    async function () {
      const leaseAmount = 10e8;

      const stakeTx = invokeScript({
        dApp: this.accounts.l2mpLeasing.addr,
        call: {
          function: 'leaseByAddress',
          args: [{
            type: 'string',
            value: this.accounts.node2.addr,
          },
          {
            type: 'string',
            value: this.accounts.user2.addr,

          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: leaseAmount },
        ],
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges, height } = await broadcastAndWait(stakeTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s__${this.accounts.node2.addr}`,
          type: 'string',
          value: `%d%d%d%d__${periodStart}__0__${periodStart + periodLength}__${leaseAmount}`,
        },
        {
          key: `%s%s__${this.accounts.node2.addr}__${this.accounts.user2.addr}`,
          type: 'string',
          value: `%d%d%d%d__${periodStart}__0__${periodStart + periodLength}__${leaseAmount}`,
        },
        {
          key: `%s%s__toClaim__${this.accounts.user2.addr}`,
          type: 'string',
          value: `%d%d%d%d__${periodStart}__0__${periodStart + periodLength}__0`,
        },
        {
          key: `%s%s__userTotalLocked__${this.accounts.user2.addr}`,
          type: 'integer',
          value: leaseAmount,
        },
        {
          key: `%s%d__${this.accounts.node2.addr}__${height}`,
          type: 'integer',
          value: leaseAmount,
        },
        {
          key: `%s%s%d__${this.accounts.node2.addr}__${this.accounts.user2.addr}__${height}`,
          type: 'integer',
          value: leaseAmount,
        },
      ]);
    },
  );
});
