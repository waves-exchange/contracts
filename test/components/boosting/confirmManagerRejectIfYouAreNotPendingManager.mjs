import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  invokeScript,
} from '@waves/waves-transactions';
import {
  publicKey,
} from '@waves/ts-lib-crypto';

import { api, broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const chainId = 'R';

describe('boosting: confirmManagerRejectIfYouAreNotPendingManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject confirmManager',
    async function () {
      const anotherPublicKeyManager = publicKey(this.accounts.factory.seed);
      const anotherInvalidPublicKeyManager = this.accounts.user0.seed;

      const expectedRejectMessage = 'You are not pending manager';

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
      }, anotherInvalidPublicKeyManager);

      await expect(
        api.transactions.broadcast(confirmManagerTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: boosting.ride: ${expectedRejectMessage}`,
      );
    },
  );
});
