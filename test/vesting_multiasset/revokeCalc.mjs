import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { waitForHeight } from '../api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, votingDuration: number, wxAssetId: string}
 * } MochaSuiteModified
 * */
describe('vesting_multiasset: revokeCalc.mjs', /** @this {MochaSuiteModified} */() => {
  it('should calc revoked total', async function () {
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

    await waitForHeight(minedCreateDepositFor.height + 3);

    const revoke = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'revokeDepositFor',
        args: [
          { type: 'string', value: this.wxAssetId },
          { type: 'string', value: user1 },
        ],
      },
      chainId,
    }, this.accounts.admin);
    await api.transactions.broadcast(revoke, {});
    const minedRevoke = await ni.waitForTx(revoke.id, { apiBase });

    const unclaimed = (minedRevoke.height - minedCreateDepositFor.height) * 2;
    const { stateChanges } = await api.transactions.fetchInfo(revoke.id);
    expect(stateChanges.data).to.eql([{
      key: `%s%s%s__revoked__${this.wxAssetId}__${user1}`,
      type: 'boolean',
      value: true,
    }, {
      key: `%s%s__revokedTotal__${this.wxAssetId}`,
      type: 'integer',
      value: 10000 - unclaimed,
    }, {
      key: `%s%s__${this.wxAssetId}__${user1}`,
      type: 'string',
      value: `%d%d%d%d%d__10000__${unclaimed}__0__0__${minedCreateDepositFor.height}`,
    }]);
  });
});
