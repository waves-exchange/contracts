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
describe('vesting: revokeLastClaim.mjs', /** @this {MochaSuiteModified} */() => {
  it('should correct do last claim after revoke', async function () {
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
    const { height } = await ni.waitForTx(createDepositFor.id, { apiBase });

    await waitForHeight(height + 3);

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
    const minedClaim1 = await ni.waitForTx(claim1.id, { apiBase });

    await waitForHeight(minedClaim1.height + 3);

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
    const minedRevoke = await ni.waitForTx(revoke.id, { apiBase });

    await waitForHeight(minedRevoke.height + 3);

    const beforeClaim2 = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);
    const claim2 = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(claim2, {});
    await ni.waitForTx(claim2.id, { apiBase });
    const afterClaim2 = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);

    const diffUnclaimed = (minedRevoke.height - minedClaim1.height) * 2;
    const diffBalance = afterClaim2.balance - beforeClaim2.balance;
    expect(diffBalance).equal(diffUnclaimed);
  });
});
