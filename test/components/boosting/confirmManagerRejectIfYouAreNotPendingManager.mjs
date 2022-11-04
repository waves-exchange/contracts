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

describe('boosting: confirmManagerRejectIfYouAreNotPendingManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject confirmManager',
    async function () {
      const anotherPublicKeyManager = publicKey(this.accounts.factoryV2);
      const anotherInvalidPublicKeyManager = this.accounts.user1;
      const boosting = address(this.accounts.boosting, chainId);

      const expectedRejectMessage = 'You are not pending manager';

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
      }, anotherInvalidPublicKeyManager);

      await expect(
        api.transactions.broadcast(confirmManagerTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: ${expectedRejectMessage}`,
      );
    },
  );
});
