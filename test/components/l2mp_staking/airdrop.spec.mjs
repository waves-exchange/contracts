import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: airdrop function', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to airdrop locked assets',
    async function () {
      const user1AirdropAmount = 30003;
      const user2AirdropAmount = 40004;
      const airdropTotalAmount = user1AirdropAmount + user2AirdropAmount;

      const airdropTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'airdrop',
          args: [{
            type: 'list',
            value: [
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
              {
                type: 'string',
                value: this.accounts.user2.addr,
              },
            ],
          },
          {
            type: 'list',
            value: [
              {
                type: 'integer',
                value: user1AirdropAmount,
              },
              {
                type: 'integer',
                value: user2AirdropAmount,
              },
            ],
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: airdropTotalAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges } = await broadcastAndWait(airdropTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: '%s__totalLockedLpAmount',
          type: 'integer',
          value: airdropTotalAmount,
        },
        {
          key: '%s__totalLpAmount',
          type: 'integer',
          value: airdropTotalAmount,
        },
        {
          key: '%s__totalAssetAmount',
          type: 'integer',
          value: airdropTotalAmount,
        },
        {
          key: `%s%s__userLockedLpAmount__${this.accounts.user1.addr}`,
          type: 'integer',
          value: user1AirdropAmount,
        },
        {
          key: `%s%s__userLockedLpAmount__${this.accounts.user2.addr}`,
          type: 'integer',
          value: user2AirdropAmount,
        },
      ]);
    },
  );
});
