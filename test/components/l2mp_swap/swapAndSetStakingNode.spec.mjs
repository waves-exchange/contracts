import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_swap: swapAndSetStakingNode', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully swap token and set staking node',
    async function () {
      const assetInAmount = 1e6;
      const price = 1e6;
      const expectedAssetOutAmount = (assetInAmount * 1e8) / price;

      const { stateChanges } = await broadcastAndWait(invokeScript({
        dApp: this.accounts.l2mpSwap.addr,
        call: {
          function: 'swapAndSetStakingNode',
          args: [
            { type: 'boolean', value: true },
            { type: 'string', value: this.accounts.node1.addr },
          ],
        },
        payment: [
          { assetId: this.xtnAssetId, amount: assetInAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed));

      expect(stateChanges.burns).to.have.lengthOf(0);
      expect(stateChanges.invokes[0].dApp).to.equal(this.accounts.l2mpStaking.addr);
      expect(stateChanges.invokes[0].call.function).to.equal('stakeForSwapHELPER');
      expect(stateChanges.invokes[0].call.args[0].value).to.equal(this.accounts.user1.addr);
      expect(stateChanges.invokes[0].call.args[1].value).to.equal(this.accounts.node1.addr);
      expect(stateChanges.invokes[0].payment[0].assetId).to.equal(this.l2mpAssetId);
      expect(stateChanges.invokes[0].payment[0].amount).to.equal(expectedAssetOutAmount);
    },
  );
});
