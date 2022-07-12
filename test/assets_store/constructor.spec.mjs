import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {Mocha.Suite & {accounts: Object.<string, number>}} MochaSuiteModified */

describe('Assets Store - Constructor', /** @this {MochaSuiteModified} */() => {
  it('Invalid caller', async function () {
    const invokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.pools, chainId) }, // userPoolsContract
          { type: 'list', value: [] }, // labels
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.user);
    return expect(api.transactions.broadcast(invokeTx, {})).to.be.rejectedWith('Permission denied');
  });

  it('Invalid user_pools address', async function () {
    const invokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.pools, chainId).slice(1) }, // userPoolsContract
          { type: 'list', value: [] }, // labels
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    return expect(api.transactions.broadcast(invokeTx, {})).to.be.rejectedWith('Invalid address');
  });

  it('Valid params and caller', async function () {
    const invokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.pools, chainId) }, // userPoolsContract
          { type: 'list', value: [] }, // labels
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    return expect(api.transactions.broadcast(invokeTx, {})).to.be.fulfilled;
  });
});
