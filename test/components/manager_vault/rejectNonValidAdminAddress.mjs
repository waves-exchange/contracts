import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { api, chainId } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('manager_vault: addNewAdmin() validation', /** @this {MochaSuiteModified} */() => {
  it(
    'reject if address is not valid',
    async function () {
      const managerVault = address(this.accounts.managerVault, chainId);
      const vote1tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'addNewAdmin',
          args: [{ type: 'string', value: 'AAA' }],
        },
        chainId,
      }, this.accounts.admin1);
      await expect(api.transactions.broadcast(vote1tx, {}))
        .to.be.rejectedWith('AAA is not valid Address');
    },
  );
});
