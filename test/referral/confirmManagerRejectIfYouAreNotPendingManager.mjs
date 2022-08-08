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

describe('referral: confirmManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully confirmManager',
    async function () {
      const anotherPublicKeyManager = publicKey(this.accounts.implementation);
      const anotherInvalidPublicKeyManager = this.accounts.backend;
      const referral = address(this.accounts.referral, chainId);

      const expectedRejectMessage = 'referral.ride: you are not pending manager';

      const setManagerTx = invokeScript({
        dApp: referral,
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
        dApp: referral,
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
        `Error while executing account-script: ${expectedRejectMessage}`,
      );
    },
  );
});
