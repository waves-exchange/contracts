import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
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
describe('vesting_multiasset: increaseDepositFor.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully increaseDepositFor', async function () {
    const vesting = address(this.accounts.vesting_multiasset, chainId);
    const user1 = address(this.accounts.user1, chainId);

    const createDepositFor = invokeScript({
      dApp: vesting,
      payment: [{
        assetId: this.wxAssetId,
        amount: 10000,
      }],
      call: {
        function: 'createDepositFor',
        args: [
          { type: 'string', value: user1 },
          { type: 'integer', value: 5000 },
        ],
      },
      chainId,
    }, this.accounts.user3);
    await api.transactions.broadcast(createDepositFor, {});
    const minedCreateDepositFor = await ni.waitForTx(createDepositFor.id, { apiBase });

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
    }, this.accounts.user4);
    await api.transactions.broadcast(increaseDepositFor, {});
    await ni.waitForTx(increaseDepositFor.id, { apiBase });

    const { stateChanges } = await api.transactions.fetchInfo(increaseDepositFor.id);
    expect(stateChanges.data).to.eql([{
      type: 'string',
      key: `%s%s__${this.wxAssetId}__${user1}`,
      value: `%d%d%d%d%d__30000__30000__0__0__${minedCreateDepositFor.height}`,
    }, {
      type: 'integer',
      key: `%s%s%s__amountPerBlock__${this.wxAssetId}__${user1}`,
      value: 6,
    }]);
  });
});
