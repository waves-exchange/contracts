import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  invokeScript,
} from '@waves/waves-transactions';

import { api } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const chainId = 'R';

describe('boosting: confirmManagerRejectIfNoPendingManager.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should reject confirmManager',
    async function () {
      const someAccount = this.accounts.factory.seed;

      const expectedRejectMessage = 'No pending manager';

      const confirmManagerTx = invokeScript({
        dApp: this.accounts.boosting.addr,
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
        `Error while executing dApp: boosting.ride: ${expectedRejectMessage}`,
      );
    },
  );
});
