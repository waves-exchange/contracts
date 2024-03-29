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
describe('vesting_multiasset: revokeOnlyAdmin.mjs', /** @this {MochaSuiteModified} */() => {
  it('should fail if non-manager trying to revoke somebody', async function () {
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
    await ni.waitForTx(createDepositFor.id, { apiBase });

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
    }, this.accounts.user2);
    await expect(api.transactions.broadcast(revoke, {})).to.be
      .rejectedWith('Error while executing dApp: vesting_multiasset.ride: permission denied');
  });
});
