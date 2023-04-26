import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import {
  api, apiBase, chainId,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('manager_vault: new manager', /** @this {MochaSuiteModified} */() => {
  it(
    'vote for new manager, confirm manager, deactivate and reactivate',
    async function () {
      const managerVault = address(this.accounts.managerVault, chainId);

      // Admin1 vote for new Manager1 (quorum: 2 votes)
      const vote1tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'voteForNewManager',
          args: [{ type: 'string', value: publicKey(this.accounts.manager1) }],
        },
        chainId,
      }, this.accounts.admin1);
      await api.transactions.broadcast(vote1tx, {});
      const vote1 = await ni.waitForTx(vote1tx.id, { apiBase });

      expect(vote1.stateChanges.data).to.deep.eql([{
        key: `%s%s%s__setManager__${publicKey(this.accounts.manager1)}__${address(this.accounts.admin1, chainId)}`,
        type: 'integer',
        value: 1,
      }]);

      // Admin3 votes for new Manager1
      // Manager1 is set as Pending Manager
      // All votes for Manger1 is cleared
      const vote2tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'voteForNewManager',
          args: [{ type: 'string', value: publicKey(this.accounts.manager1) }],
        },
        chainId,
      }, this.accounts.admin3);
      await api.transactions.broadcast(vote2tx, {});
      const vote2 = await ni.waitForTx(vote2tx.id, { apiBase });

      expect(vote2.stateChanges.data).to.deep.eql([{
        key: `%s%s%s__setManager__${publicKey(this.accounts.manager1)}__${address(this.accounts.admin1, chainId)}`,
        value: null,
      },
      {
        key: `%s%s%s__setManager__${publicKey(this.accounts.manager1)}__${address(this.accounts.admin2, chainId)}`,
        value: null,
      },
      {
        key: `%s%s%s__setManager__${publicKey(this.accounts.manager1)}__${address(this.accounts.admin3, chainId)}`,
        value: null,
      },
      {
        key: '%s__pendingManagerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager1),
      }]);

      // Manager2 cannot confirm pending manager
      const confirmByDifferentManagerTx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'confirmManager',
          args: [],
        },
        chainId,
      }, this.accounts.manager2);
      await expect(api.transactions.broadcast(confirmByDifferentManagerTx))
        .to.be.rejectedWith('you are not pending manager');

      // Manager1 confirms his Public Key
      // Public Key is set as current and active
      // Pending key is cleared
      const confirmManagerTx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'confirmManager',
          args: [],
        },
        chainId,
      }, this.accounts.manager1);
      await api.transactions.broadcast(confirmManagerTx, {});
      const confirm = await ni.waitForTx(confirmManagerTx.id, { apiBase });

      expect(confirm.stateChanges.data).to.deep.eql([{
        key: '%s__currentManagerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager1),
      },
      {
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager1),
      },
      {
        key: '%s__pendingManagerPublicKey',
        value: null,
      }]);

      // Admin2 deactivates manager
      // manager key is set to value 'disabled'
      // All votes to deactivate is cleared (quorum: 1 vote)
      const deactivateManagerTx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'deactivateManager',
          args: [],
        },
        chainId,
      }, this.accounts.admin2);
      await api.transactions.broadcast(deactivateManagerTx, {});
      const deactivate = await ni.waitForTx(deactivateManagerTx.id, { apiBase });

      expect(deactivate.stateChanges.data).to.deep.eql([{
        key: `%s%s__deactivateManager__${address(this.accounts.admin1, chainId)}`,
        value: null,
      },
      {
        key: `%s%s__deactivateManager__${address(this.accounts.admin2, chainId)}`,
        value: null,
      },
      {
        key: `%s%s__deactivateManager__${address(this.accounts.admin3, chainId)}`,
        value: null,
      },
      {
        key: '%s__managerPublicKey',
        type: 'string',
        value: 'disabled',
      }]);

      // Admin2 votes to activate manager (quorum: 2 votes)
      const activateVote1tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'activateManager',
          args: [],
        },
        chainId,
      }, this.accounts.admin2);
      await api.transactions.broadcast(activateVote1tx, {});
      const activate1 = await ni.waitForTx(activateVote1tx.id, { apiBase });

      expect(activate1.stateChanges.data).to.deep.eql([{
        key: `%s%s__activateManager__${address(this.accounts.admin2, chainId)}`,
        type: 'integer',
        value: 1,
      }]);

      // Admin3 votes to activate manager
      // manger key is set to current manager
      // All votes are cleared
      const activateVote2tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'activateManager',
          args: [],
        },
        chainId,
      }, this.accounts.admin3);
      await api.transactions.broadcast(activateVote2tx, {});
      const activate2 = await ni.waitForTx(activateVote2tx.id, { apiBase });

      expect(activate2.stateChanges.data).to.deep.eql([{
        key: `%s%s__activateManager__${address(this.accounts.admin1, chainId)}`,
        value: null,
      },
      {
        key: `%s%s__activateManager__${address(this.accounts.admin2, chainId)}`,
        value: null,
      },
      {
        key: `%s%s__activateManager__${address(this.accounts.admin3, chainId)}`,
        value: null,
      },
      {
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager1),
      }]);
    },
  );
});
