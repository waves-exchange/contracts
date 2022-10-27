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

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, votingDuration: number, wxAssetId: string}
 * } MochaSuiteModified
 * */
describe('vesting: increaseDepositForNoDeposit.mjs', /** @this {MochaSuiteModified} */() => {
  it('should fail if called increaseDepositFor without deposit', async function () {
    const vesting = address(this.accounts.vesting, chainId);
    const user1 = address(this.accounts.user1, chainId);

    const increaseDepositFor = invokeScript({
      dApp: vesting,
      payment: [{
        assetId: this.wxAssetId,
        amount: 20000,
      }],
      call: {
        function: 'increaseDepositFor',
        args: [
          { type: 'string', value: user1 },
        ],
      },
      chainId,
    }, this.accounts.manager);
    await expect(api.transactions.broadcast(increaseDepositFor, {})).to.be
      .rejectedWith('Error while executing dApp: value() called on unit value on function \'getString\' call');
  });
});
