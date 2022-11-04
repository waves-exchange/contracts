import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('boosting: confirmManagerRejectIfNoPendingManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject confirmManager',
    async function () {
      const boosting = address(this.accounts.boosting, chainId);
      const someAccount = this.accounts.factoryV2;

      const expectedRejectMessage = 'No pending manager';

      const confirmManagerTx = invokeScript({
        dApp: boosting,
        payment: [],
        call: {
          function: 'confirmManager',
          args: [],
        },
        chainId,
      }, someAccount);

      await expect(
        api.transactions.broadcast(confirmManagerTx, {}),
      ).to.be.rejectedWith(
        `Error while executing dApp: ${expectedRejectMessage}`,
      );
    },
  );
});
