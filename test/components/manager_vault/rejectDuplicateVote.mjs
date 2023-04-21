import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, data, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('manager_vault: admin duplicate vote', /** @this {MochaSuiteModified} */() => {
  it(
    'tx should be rejected if admin is already voted',
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
      await api.transactions.broadcast(vote1tx);
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
      }, this.accounts.admin1);

      await expect(api.transactions.broadcast(vote2tx))
        .to.rejectedWith(`${address(this.accounts.admin1, chainId)} you already voted`);
    },
  );
});
