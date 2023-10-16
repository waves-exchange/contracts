import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { gwxReward } from './contract/gwxReward.mjs';

chai.use(chaiAsPromised);

describe('gwxReward: refreshUserReward.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully refresh user reward',
    async function () {
      const { stateChanges } = await gwxReward.refreshUserReward({
        caller: this.accounts.boosting.seed,
        gwxRewardAddress: this.accounts.gwxReward.addr,
        userAddress: this.accounts.user0.addr,
        userNum: 0,
      });

      // TODO: check stateChanges
    },
  );
});
