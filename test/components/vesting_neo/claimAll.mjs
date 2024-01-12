import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('vesting_neo: claimAll', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to claim multiple vestings',
    async function () {
      const vestingAmount1 = 100000;
      const vestingAmount2 = 200000;
      const startHeight = 1;
      const lockLength = 2;

      const vestingTx1 = invokeScript({
        dApp: this.accounts.vestingNeo.addr,
        call: {
          function: 'vestingForUser',
          args: [
            { type: 'string', value: this.accounts.user1.addr },
            { type: 'integer', value: vestingAmount1 },
            { type: 'integer', value: startHeight },
            { type: 'integer', value: lockLength },
          ],
        },
        payment: [
          { assetId: this.wxAssetId, amount: vestingAmount1 },
        ],
        chainId,
      }, this.accounts.admin1.seed);

      const vestingTx2 = invokeScript({
        dApp: this.accounts.vestingNeo.addr,
        call: {
          function: 'vestingForUser',
          args: [
            { type: 'string', value: this.accounts.user1.addr },
            { type: 'integer', value: vestingAmount2 },
            { type: 'integer', value: startHeight },
            { type: 'integer', value: lockLength },
          ],
        },
        payment: [
          { assetId: this.wxAssetId, amount: vestingAmount2 },
        ],
        chainId,
      }, this.accounts.admin1.seed);

      await broadcastAndWait(vestingTx1);
      await broadcastAndWait(vestingTx2);

      const claimTx = invokeScript({
        dApp: this.accounts.vestingNeo.addr,
        call: {
          function: 'claimAll',
        },
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges, id } = await broadcastAndWait(claimTx);

      expect(stateChanges.data).to.be.deep.equal([
        {
          key: `%s%s%d__vesting__${this.accounts.user1.addr}__0`,
          value: null,
        },
        {
          key: `%s%s%d__vesting__${this.accounts.user1.addr}__1`,
          value: null,
        },
        {
          key: `%s%s%s%s__history__${this.accounts.user1.addr}__claimed__${id}`,
          type: 'string',
          value: `${vestingAmount1 + vestingAmount2}`,
        },
      ]);

      expect(stateChanges.transfers).to.be.deep.equal([
        {
          address: this.accounts.user1.addr,
          amount: vestingAmount1,
          asset: this.wxAssetId,
        },
        {
          address: this.accounts.user1.addr,
          amount: vestingAmount2,
          asset: this.wxAssetId,
        },
      ]);
    },
  );
});
