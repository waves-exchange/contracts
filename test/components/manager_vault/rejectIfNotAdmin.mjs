import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, data } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('manager_vault: not an admin', /** @this {MochaSuiteModified} */() => {
  it(
    'tx should be rejected if user is not an admin',
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
      }, this.accounts.user1);

      await expect(api.transactions.broadcast(vote1tx))
        .to.rejectedWith(`${address(this.accounts.user1, chainId)} not in Admin list`);
    },
  );
});
