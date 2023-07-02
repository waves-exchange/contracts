import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { gwxReward } from './contract/gwxReward.mjs';

chai.use(chaiAsPromised);

const reward = Number(1e8);

describe('gwxReward: claimTradeReward.mjs', /** @this {MochaSuiteModified} */() => {
  before(async function () {
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

    await gwxReward.tradeReward({
      caller: this.accounts.user0.seed,
      gwxRewardAddress: this.accounts.gwxReward.addr,
      userAddresses,
      rewards,
      payments: [
        { assetId: this.wxAssetId, amount: reward * rewards.length },
      ],
    });
  });

  it(
    'should successfully claimReward',
    async function () {
      const res = await gwxReward.claimTradingReward({
        caller: this.accounts.user1.seed,
        gwxRewardAddress: this.accounts.gwxReward.addr,
      });

      const resStateChanges = await res.stateChanges;
      expect(resStateChanges.data).to.deep.eql([
        {
          key: `%s%s__tradingReward__${this.accounts.user1.addr}`,
          type: 'integer',
          value: 0,
        },
      ]);

      expect(resStateChanges.transfers).to.deep.eql([
        {
          address: this.accounts.user1.addr,
          asset: this.wxAssetId,
          amount: reward,
        },
      ]);
    },
  );
});
