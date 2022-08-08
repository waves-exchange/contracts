import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: lockRefReferrerAddressIsEmpty.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully lockRef is referrerAddress is empty',
    async function () {
      const duration = 0;
      const referrerAddress = '';
      const signature = '';
      const expectedPendingManagerPublicKey = null;

      const lockRefTx = invokeScript({
        dApp: boosting,
        payment: [],
        call: {
          function: 'lockRefTx',
          args: [
            { type: 'integer', value: duration },
            { type: 'string', value: referrerAddress },
            { type: 'string', value: signature },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(lockRefTx, {});
      await ni.waitForTx(lockRefTx.id, { apiBase });

      expect(stateChanges.data).to.eql([{
        key: '%s__managerPublicKey',
        type: 'string',
        value: anotherPublicKeyManager,
      }, {
        key: '%s__pendingManagerPublicKey',
        value: expectedPendingManagerPublicKey,
      }]);
    },
  );
});
