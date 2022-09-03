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
describe('vesting_multiasset: claimSeries.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully do claim series', async function () {
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
    }, this.accounts.manager);
    await api.transactions.broadcast(createDepositFor, {});
    const minedCreateDepositFor = await ni.waitForTx(createDepositFor.id, { apiBase });

    await waitForHeight(minedCreateDepositFor.height + 3);

    const beforeClaim1 = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);
    const claim1 = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(claim1, {});
    const minedClaim1 = await ni.waitForTx(claim1.id, { apiBase });
    const afterClaim1 = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);

    await waitForHeight(minedClaim1.height + 6);

    const claim2 = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(claim2, {});
    const minedClaim2 = await ni.waitForTx(claim2.id, { apiBase });
    const afterClaim2 = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);

    const diffBlocks1 = minedClaim1.height - minedCreateDepositFor.height;
    const diffBalance1 = afterClaim1.balance - beforeClaim1.balance;
    expect(diffBalance1).equal(diffBlocks1 * 2);

    const diffBlocks2 = minedClaim2.height - minedClaim1.height;
    const diffBalance2 = afterClaim2.balance - afterClaim1.balance;
    expect(diffBalance2).equal(diffBlocks2 * 2);
  });
});
