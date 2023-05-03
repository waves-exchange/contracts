import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { api, chainId } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('manager_vault: removeAdmin() validation', /** @this {MochaSuiteModified} */() => {
  it(
    'reject if admin not found',
    async function () {
      const managerVault = address(this.accounts.managerVault, chainId);
      const vote1tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'removeAdmin',
          args: [{ type: 'string', value: address(this.accounts.user1, chainId) }],
        },
        chainId,
      }, this.accounts.admin1);
      await expect(api.transactions.broadcast(vote1tx, {}))
        .to.be.rejectedWith(`${address(this.accounts.user1, chainId)} not found in Admin List`);
    },
  );
});
