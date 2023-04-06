import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  invokeScript,
} from '@waves/waves-transactions';
import {
  publicKey,
} from '@waves/ts-lib-crypto';

import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const chainId = 'R';

describe('boosting: confirmManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully confirmManager',
    async function () {
      const anotherPublicKeyManager = publicKey(this.accounts.manager.seed);

      const expectedPendingManagerPublicKey = null;

      const setManagerTx = invokeScript({
        dApp: this.accounts.boosting.addr,
        payment: [],
        call: {
          function: 'setManager',
          args: [
            { type: 'string', value: anotherPublicKeyManager },
          ],
        },
        chainId,
      }, this.accounts.boosting.seed);
      await broadcastAndWait(setManagerTx);

      const confirmManagerTx = invokeScript({
        dApp: this.accounts.boosting.addr,
        payment: [],
        call: {
          function: 'confirmManager',
          args: [],
        },
        chainId,
      }, this.accounts.manager.seed);
      const { stateChanges } = await broadcastAndWait(confirmManagerTx);

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
