import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('vesting_neo: vestingForUser', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to create a vesting',
    async function () {
      const vestingAmount = 12345678;
      const startHeight = 2000123;
      const lockLength = 1440;

      const vestingTx = invokeScript({
        dApp: this.accounts.vestingNeo.addr,
        call: {
          function: 'vestingForUser',
          args: [
            { type: 'string', value: this.accounts.user1.addr },
            { type: 'integer', value: vestingAmount },
            { type: 'integer', value: startHeight },
            { type: 'integer', value: lockLength },
          ],
        },
        payment: [
          { assetId: this.wxAssetId, amount: vestingAmount },
        ],
        chainId,
      }, this.accounts.admin1.seed);

      const { stateChanges, id } = await broadcastAndWait(vestingTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s%s%d__vesting__${this.accounts.user1.addr}__0`,
          type: 'string',
          value: `%d%d%d__${vestingAmount}__${startHeight}__${lockLength}`,
        },
        {
          key: `%s%s%s%s__history__${this.accounts.user1.addr}__vested__${id}`,
          type: 'string',
          value: `${vestingAmount}__${startHeight}__${lockLength}`,
        },
      ]);
    },
  );
});
