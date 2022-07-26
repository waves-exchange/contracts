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
describe('vesting: revokeNothingToClaim.mjs', /** @this {MochaSuiteModified} */() => {
  it('should return "nothing to claim" after revoke + last claim', async function () {
    const vesting = address(this.accounts.vesting, chainId);
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
    }, this.accounts.manager);
    await api.transactions.broadcast(createDepositFor, {});
    const { height: heightCreateDepositFor } = await ni.waitForTx(createDepositFor.id, { apiBase });

    await waitForHeight(heightCreateDepositFor + 3);

    const revoke = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'revokeDepositFor',
        args: [{ type: 'string', value: user1 }],
      },
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(revoke, {});
    const { height: heightRevoke } = await ni.waitForTx(revoke.id, { apiBase });

    await waitForHeight(heightRevoke + 3);

    const claim1 = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(claim1, {});
    const { height: heightClaim1 } = await ni.waitForTx(claim1.id, { apiBase });

    await waitForHeight(heightClaim1 + 3);

    const claim2 = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [],
      },
      chainId,
    }, this.accounts.user1);
    await expect(api.transactions.broadcast(claim2, {})).to.be
      .rejectedWith('Error while executing account-script: vesting.ride: nothing to claim');
  });
});
