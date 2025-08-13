import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, data } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('wxdao_funding: process', /** @this {MochaSuiteModified} */() => {
  it(
    'should fail if Waves amount is less than minClaimAmount',
    async function () {
      await broadcastAndWait(data({
        additionalFee: 4e5,
        data: [
          {
            key: '%s__minClaimAmount',
            type: 'integer',
            value: 300_0000_0000, // 300.0 WAVES
          },
        ],
        chainId,
      }, this.accounts.wxdaoFunding.seed));

      const invoke = invokeScript({
        dApp: this.accounts.wxdaoFunding.addr,
        call: {
          function: 'process',
        },
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(invoke)).to.be.rejectedWith('not enough claim amount');
    },
  );
});
