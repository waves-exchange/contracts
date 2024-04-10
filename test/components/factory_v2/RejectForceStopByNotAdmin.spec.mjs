import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
// const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, wxAssetId: string, usdnAssetId: string}
 * } MochaSuiteModified
 * */

describe('Factory V2 - force stop contract', /** @this {MochaSuiteModified} */() => {
  it('Force stop contract is rejected if caller is not an Admin', async function () {
    const forceStopInvokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'forceStopContract',
        args: [
          { type: 'string', value: address(this.accounts.lp, chainId) },
          { type: 'boolean', value: true },
        ],
      },
      fee: 1e8 + 9e5,
      chainId,
    }, this.accounts.lp);

    await expect(api.transactions.broadcast(forceStopInvokeTx, {}))
      .to.be
      .rejectedWith('Permission denied');
  });
});
