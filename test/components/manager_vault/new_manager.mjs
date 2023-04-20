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

describe('manager_vault: new manager', /** @this {MochaSuiteModified} */() => {
  it(
    'vote for new manager, confirm manager, deactivate and reactivate',
    async function () {
      const managerVault = address(this.accounts.managerVault, chainId);
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
