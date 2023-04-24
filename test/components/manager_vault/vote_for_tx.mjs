import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, data, nodeInteraction as ni } from '@waves/waves-transactions';
import { api, apiBase, chainId } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('manager_vault: vote for allowed tx', /** @this {MochaSuiteModified} */() => {
  it(
    'tx should be rejected before vote for allowed txid',
    async function () {
      const managerVault = address(this.accounts.managerVault, chainId);
      const dataTx = data({
        additionalFee: 4e5,
        data: [{ key: 'foo', type: 'string', value: 'bar' }],
        chainId,
      }, this.accounts.managerVault);

      await expect(api.transactions.broadcast(dataTx)).to.be.rejectedWith();

      const vote1tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }],
        },
        chainId,
      }, this.accounts.admin1);
      await api.transactions.broadcast(vote1tx, {});
      const vote1 = await ni.waitForTx(vote1tx.id, { apiBase });

      expect(vote1.stateChanges.data).to.deep.eql([{
        key: `%s%s%s__allowTxId__${dataTx.id}__${address(this.accounts.admin1, chainId)}`,
        type: 'integer',
        value: 1,
      }]);

      const vote2tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: dataTx.id }],
        },
        chainId,
      }, this.accounts.admin3);
      await api.transactions.broadcast(vote2tx, {});
      const vote2 = await ni.waitForTx(vote2tx.id, { apiBase });

      expect(vote2.stateChanges.data).to.deep.eql([{
        key: `%s%s%s__allowTxId__${dataTx.id}__${address(this.accounts.admin1, chainId)}`,
        value: null,
      },
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${address(this.accounts.admin2, chainId)}`,
        value: null,
      },
      {
        key: `%s%s%s__allowTxId__${dataTx.id}__${address(this.accounts.admin3, chainId)}`,
        value: null,
      },
      {
        key: '%s__TXID',
        type: 'string',
        value: dataTx.id,
      }]);

      await api.transactions.broadcast(dataTx);
      const newData = await ni.waitForTx(dataTx.id, { apiBase });
      expect(newData.data).to.deep.eql([{
        key: 'foo',
        type: 'string',
        value: 'bar',
      }]);
    },
  );
});
