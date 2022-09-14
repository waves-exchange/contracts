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
describe('vesting_multiasset: claim.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully createDepositFor and claim', async function () {
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

    const beforeClaim = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);
    const claim = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(claim, {});
    const minedClaim = await ni.waitForTx(claim.id, { apiBase });
    const afterClaim = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);

    const diffBlocks = minedClaim.height - minedCreateDepositFor.height;
    const diffBalance = afterClaim.balance - beforeClaim.balance;
    expect(diffBalance).equal(diffBlocks * 2);
  });
});
