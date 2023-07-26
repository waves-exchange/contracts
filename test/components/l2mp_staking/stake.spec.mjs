import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: staking', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to stake token',
    async function () {
      const stakeAmount1 = 10e8;
      const price = 1;
      const expectedLpAmount1 = stakeAmount1 * price;

      const stakeTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'stake',
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: stakeAmount1 },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges, height } = await broadcastAndWait(stakeTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: '%s__totalLpAmount',
          type: 'integer',
          value: expectedLpAmount1,
        },
        {
          key: '%s__totalAssetAmount',
          type: 'integer',
          value: stakeAmount1,
        },
        {
          key: `%s%s__userLpAmount__${this.accounts.user1.addr}`,
          type: 'integer',
          value: expectedLpAmount1,
        },
        {
          key: `%s%s__totalAssetStaked__${this.accounts.user1.addr}`,
          type: 'integer',
          value: stakeAmount1,
        },
        {
          key: '%s__startBlock',
          type: 'integer',
          value: height,
        },
      ]);
    },
  );
});
