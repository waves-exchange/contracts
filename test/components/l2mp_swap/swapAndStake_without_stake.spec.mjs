import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_swap: swapAndStake', /** @this {MochaSuiteModified} */() => {
  it(
    'should be rejected is nodeAddress is not valid',
    async function () {
      const assetInAmount = 1e6;

      const invokeTx = invokeScript({
        dApp: this.accounts.l2mpSwap.addr,
        call: {
          function: 'swapAndStake',
          args: [
            { type: 'string', value: '' },
          ],
        },
        payment: [
          { assetId: this.xtnAssetId, amount: assetInAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(invokeTx)).to.rejectedWith('staking node address is no valid');
    },
  );
});
