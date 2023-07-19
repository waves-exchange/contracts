import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { gwxReward } from './contract/gwxReward.mjs';

chai.use(chaiAsPromised);

function calculateTransfersNumber(stateChanges) {
  let transfersNumber = 0;
  const flat = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (key === 'data') {
        transfersNumber += obj[key].length;
      }
      if (typeof obj[key] === 'object') {
        flat(obj[key]);
      }
    });
    return transfersNumber;
  };

  return flat(stateChanges) / 2;
}

describe('gwxReward: tradeReward.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully tradeReward',
    async function () {
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

      const res = await gwxReward.tradeReward({
        caller: this.accounts.user0.seed,
        gwxRewardAddress: this.accounts.gwxReward.addr,
        userAddresses,
        rewards,
        payments: [
          { assetId: this.wxAssetId, amount: reward * rewards.length },
        ],
      });

      const resStateChanges = await res.stateChanges;
      expect(calculateTransfersNumber(resStateChanges)).to.eql(userAddresses.length);
    },
  );
});
