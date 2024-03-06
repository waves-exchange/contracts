import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data, invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_leasing migration begin', /** @this {MochaSuiteModified} */() => {
  const stakeAmount1 = 12345678;
  const stakeAmount2 = 54321;
  const totalStaked = stakeAmount1 + stakeAmount2;
  const periodLength = 2;

  before(
    async function () {
      const dataTx = data({
        data: [
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
    'should be able to cancel migrated lease',
    async function () {
      const cancelAmount = 10e6;
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

      const { stateChanges } = await broadcastAndWait(cancelLeaseTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s__${this.accounts.node1.addr}`,
          type: 'string',
          value: `%d%d%d%d__0__${totalStaked}__0__${totalStaked - cancelAmount}`,
        },
        {
          key: `%s%s__${this.accounts.node1.addr}__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%d%d%d%d__0__${stakeAmount1}__0__${stakeAmount1 - cancelAmount}`,
        },
        {
          key: `%s%s__toClaim__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%d%d%d%d__0__0__0__${cancelAmount}`,
        },
        {
          key: `%s%s__userTotalLocked__${this.accounts.user1.addr}`,
          type: 'integer',
          value: stakeAmount1 - cancelAmount,
        },
        {
          key: `%s%d__${this.accounts.node1.addr}__0`,
          type: 'integer',
          value: totalStaked - cancelAmount,
        },
        {
          key: `%s%s%d__${this.accounts.node1.addr}__${this.accounts.user1.addr}__0`,
          type: 'integer',
          value: stakeAmount1 - cancelAmount,
        },
      ]);
    },
  );
});
