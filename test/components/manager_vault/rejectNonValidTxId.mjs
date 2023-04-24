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

describe('manager_vault: voteForTxId() validation', /** @this {MochaSuiteModified} */() => {
  it(
    'reject if TXID is not valid',
    async function () {
      const managerVault = address(this.accounts.managerVault, chainId);
      const vote1tx = invokeScript({
        dApp: managerVault,
        call: {
          function: 'voteForTxId',
          args: [{ type: 'string', value: 'AAA' }],
        },
        chainId,
      }, this.accounts.admin1);
      await expect(api.transactions.broadcast(vote1tx, {}))
        .to.be.rejectedWith('AAA not valid txId');
    },
  );
});
