import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { publicKey } from '@waves/ts-lib-crypto';
import {
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: setManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully setManager',
    async function () {
      const anotherPublicKeyManager = publicKey(this.accounts.factory.seed);

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
      await api.transactions.broadcast(setManagerTx, {});
      const { stateChanges } = await broadcastAndWait(setManagerTx);

      expect(stateChanges.data).to.eql([{
        key: '%s__pendingManagerPublicKey',
        type: 'string',
        value: anotherPublicKeyManager,
      }]);
    },
  );
});
