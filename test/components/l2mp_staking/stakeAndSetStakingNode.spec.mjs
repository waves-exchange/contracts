import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: staking and setting staking node', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to stake token for and set staking node',
    async function () {
      const stakeAmount = 10e8;
      const price = 1;
      const expectedPrice = price * 10e17;
      const expectedLpAmount = stakeAmount * price;

      const stakeTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'stakeAndSetStakingNode',
          args: [{
            type: 'string',
            value: this.accounts.node1.addr,
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: stakeAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges, height, id } = await broadcastAndWait(stakeTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s%s%s__stake__${this.accounts.user1.addr}__${id}`,
          type: 'string',
          value: `%d%d%d%d__0__${expectedPrice}__0__0`,
        },
        {
          key: '%s__totalLpAmount',
          type: 'integer',
          value: expectedLpAmount,
        },
        {
          key: '%s__totalAssetAmount',
          type: 'integer',
          value: stakeAmount,
        },
        {
          key: `%s%s__userLpAmount__${this.accounts.user1.addr}`,
          type: 'integer',
          value: expectedLpAmount,
        },
        {
          key: `%s%s__totalAssetStaked__${this.accounts.user1.addr}`,
          type: 'integer',
          value: stakeAmount,
        },
        {
          key: '%s__startBlock',
          type: 'integer',
          value: height,
        },
        {
          key: `%s%s__userStakingNode__${this.accounts.user1.addr}`,
          type: 'string',
          value: `%s%d__${this.accounts.node1.addr}__100`,
        },
      ]);
    },
  );
});
