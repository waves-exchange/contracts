import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import {
  invokeScript, nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
// const { expect } = chai;

const { waitForTx } = nodeInteraction;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, wxAssetId: string, usdnAssetId: string}
 * } MochaSuiteModified
 * */

describe('ForceStop - force stop contract', /** @this {MochaSuiteModified} */() => {
  it('Force stop contract by Manager', async function () {
    const poolAddress = this.accounts.dapp1.addr;

    const forceStopInvokeTx = invokeScript({
      dApp: this.accounts.forceStop.addr,
      call: {
        function: 'forceStopContract',
        args: [
          { type: 'string', value: poolAddress },
          { type: 'boolean', value: true },
        ],
      },
      fee: 1e8 + 9e5,
      chainId,
    }, this.accounts.forceStop.seed);

    await api.transactions.broadcast(forceStopInvokeTx, {});
    const { stateChanges } = await waitForTx(forceStopInvokeTx.id, { apiBase });

    expect(stateChanges.data).to.deep.eql([
      {
        key: `%s%s__stop__${poolAddress}`,
        type: 'boolean',
        value: true,
      },
    ]);
  });
});