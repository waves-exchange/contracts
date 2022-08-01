import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: confirmManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully confirmManager',
    async function () {
      const anotherPublicKeyManager = publicKey(this.accounts.factory);
      const boosting = address(this.accounts.boosting, chainId);

      const expectedPendingManagerPublicKey = null;

      const setManagerTx = invokeScript({
        dApp: boosting,
        payment: [],
        call: {
          function: 'setManager',
          args: [
            { type: 'string', value: anotherPublicKeyManager },
          ],
        },
        chainId,
      }, this.accounts.manager);
      await api.transactions.broadcast(setManagerTx, {});
      await ni.waitForTx(setManagerTx.id, { apiBase });

      const confirmManagerTx = invokeScript({
        dApp: boosting,
        payment: [],
        call: {
          function: 'confirmManager',
          args: [],
        },
        chainId,
      }, this.accounts.factory);
      await api.transactions.broadcast(confirmManagerTx, {});
      const { stateChanges } = await ni.waitForTx(confirmManagerTx.id, { apiBase });

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
