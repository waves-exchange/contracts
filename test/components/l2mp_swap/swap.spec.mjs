import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_swap: swap', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully swap token without stake and receive tokens',
    async function () {
      const assetInAmount = 1e6;
      const price = 1e6;
      const expectedAssetOutAmount = (assetInAmount * 1e8) / price;

      const { id: txId, stateChanges } = await broadcastAndWait(invokeScript({
        dApp: this.accounts.l2mpSwap.addr,
        call: {
          function: 'swap',
          args: [
            { type: 'boolean', value: false },
            { type: 'string', value: '' },
          ],
        },
        payment: [
          { assetId: this.xtnAssetId, amount: assetInAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed));

      expect(stateChanges.burns).to.have.lengthOf(0);
      expect(stateChanges.transfers).to.deep.equal([{
        asset: this.l2mpAssetId,
        amount: expectedAssetOutAmount,
        address: this.accounts.user1.addr,
      }]);
      expect(stateChanges.data).to.deep.equal([
        {
          key: '%s%s__stats__totalIn',
          type: 'integer',
          value: assetInAmount,
        },
        {
          key: '%s%s__stats__totalOut',
          type: 'integer',
          value: expectedAssetOutAmount,
        },
        {
          key: `%s%s%s__stats__totalIn__${this.accounts.user1.addr}`,
          type: 'integer',
          value: assetInAmount,
        },
        {
          key: `%s%s%s__stats__totalOut__${this.accounts.user1.addr}`,
          type: 'integer',
          value: expectedAssetOutAmount,
        },
        {
          key: `%s%s%s__history__${this.accounts.user1.addr}__${txId}`,
          type: 'string',
          value: `%d%d%d__${assetInAmount}__${expectedAssetOutAmount}__false__NULL`,
        },
      ]);
    },
  );
});
