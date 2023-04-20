import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('manager_vault: remove admin', /** @this {MochaSuiteModified} */() => {
  it(
    'vote to remove admin',
    async function () {
      const expectedAdmins = [
        address(this.accounts.admin1, chainId),
        address(this.accounts.admin3, chainId),
      ];
      const expectedAdminsString = expectedAdmins.join('__');

      const managerVault = address(this.accounts.managerVault, chainId);
      const vote1tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'removeAdmin',
          args: [{ type: 'string', value: address(this.accounts.admin2, chainId) }],
        },
        chainId,
      }, this.accounts.admin1);
      await api.transactions.broadcast(vote1tx, {});
      const vote1 = await ni.waitForTx(vote1tx.id, { apiBase });

      expect(vote1.stateChanges.data).to.deep.eql([{
        key: `%s%s%s__removeAdmin__${address(this.accounts.admin2, chainId)}__${address(this.accounts.admin1, chainId)}`,
        type: 'integer',
        value: 1,
      }]);

      const vote2tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'removeAdmin',
          args: [{ type: 'string', value: address(this.accounts.admin2, chainId) }],
        },
        chainId,
      }, this.accounts.admin3);
      await api.transactions.broadcast(vote2tx, {});
      const vote2 = await ni.waitForTx(vote2tx.id, { apiBase });

      expect(vote2.stateChanges.data).to.deep.eql([{
        key: `%s%s%s__removeAdmin__${address(this.accounts.admin2, chainId)}__${address(this.accounts.admin1, chainId)}`,
        value: null,
      },
      {
        key: `%s%s%s__removeAdmin__${address(this.accounts.admin2, chainId)}__${address(this.accounts.admin2, chainId)}`,
        value: null,
      },
      {
        key: `%s%s%s__removeAdmin__${address(this.accounts.admin2, chainId)}__${address(this.accounts.admin3, chainId)}`,
        value: null,
      },
      {
        key: '%s__adminAddressList',
        type: 'string',
        value: expectedAdminsString,
      }]);
    },
  );
});
