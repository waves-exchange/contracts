import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import {
  api, apiBase, chainId, waitForHeight, waitForTx,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('mrt_staking: set emission per block', /** @this {MochaSuiteModified} */() => {
  it(
    'should be rejected if caller is not a contract',
    async function () {
      const invokeTx = invokeScript({
        dApp: this.accounts.mptStaking.addr,
        call: {
          function: 'setEmissionPerBlock',
          args: [{
            type: 'integer',
            value: 777777,
          }],
        },
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      return expect(api.transactions.broadcast(invokeTx, {})).to.be.rejectedWith('permission denied');
    },
  );

  it(
    'should be able to change emission per block if caller is contract',
    async function () {
      const newEmissionPerBlock = 777777;

      const invokeTx = invokeScript({
        dApp: this.accounts.mptStaking.addr,
        call: {
          function: 'setEmissionPerBlock',
          args: [{
            type: 'integer',
            value: newEmissionPerBlock,
          }],
        },
        additionalFee: 4e5,
        chainId,
      }, this.accounts.mptStaking.seed);

      await api.transactions.broadcast(invokeTx, {});
      const { stateChanges, height } = await waitForTx(invokeTx.id);

      return expect(stateChanges.data).to.be.deep.equal([
        { key: '%s__totalAssetAmount', type: 'integer', value: 0 },
        { key: '%s__startBlock', type: 'integer', value: height },
        { key: '%s__emissionPerBlock', type: 'integer', value: newEmissionPerBlock },
      ]);
    },
  );
});
