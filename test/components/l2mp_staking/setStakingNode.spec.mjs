import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: set staking node', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to set staking node',
    async function () {
      const setStakingNodeTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'setStakingNode',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          }],
        },
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges } = await broadcastAndWait(setStakingNodeTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s%s__userStakingNodes__${this.accounts.user1.addr}`,
          type: 'string',
          value: `${this.accounts.node1.addr}`,
        },
        {
          key: `%s%s__userStakingNodesShares__${this.accounts.user1.addr}`,
          type: 'string',
          value: '100',
        },
      ]);
    },
  );

  it(
    'should reject if node address is invalid',
    async function () {
      const setStakingNodeTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'setStakingNode',
          args: [{
            type: 'string',
            value: 'AAAA',
          }],
        },
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(setStakingNodeTx)).to.be.rejectedWith('node address is not valid');
    },
  );
});
