import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { gwxReward } from './contract/gwxReward.mjs';

chai.use(chaiAsPromised);

describe('gwxReward: tradeReward.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject tradeReward with insufficient payment assetId',
    async function () {
      const expectedRejectMessage = 'insufficient payment assetId';
      const reward = Number(1e8);

      const userAddresses = [
        this.accounts.user0.addr,
        this.accounts.user1.addr,
        this.accounts.user2.addr,
      ];
      const rewards = [
        reward,
        reward,
        reward,
      ];

      const res = gwxReward.tradeReward({
        caller: this.accounts.user0.seed,
        gwxRewardAddress: this.accounts.gwxReward.addr,
        userAddresses,
        rewards,
        payments: [
          { assetId: this.wxAssetId, amount: reward * rewards.length - 1 },
        ],
      });

      expect(res).to.be.rejectedWith(expectedRejectMessage);
    },
  );
});
