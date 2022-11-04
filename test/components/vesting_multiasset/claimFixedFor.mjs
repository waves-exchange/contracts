import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { waitForHeight } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, votingDuration: number, wxAssetId: string}
 * } MochaSuiteModified
 * */
describe('vesting_multiasset: claimFixedFor.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully createDepositFor and claimFixedFor', async function () {
    const vesting = address(this.accounts.vesting_multiasset, chainId);
    const user1 = address(this.accounts.user1, chainId);

    const currentHeight = await api.blocks.fetchHeight();
    const releaseBlock = currentHeight.height + 10;

    const amount = 10000;

    const createFixedDepositFor = invokeScript({
      dApp: vesting,
      payment: [{
        assetId: this.wxAssetId,
        amount,
      }],
      call: {
        function: 'createFixedDepositFor',
        args: [
          { type: 'string', value: user1 },
          { type: 'integer', value: releaseBlock },
        ],
      },
      chainId,
    }, this.accounts.user3);
    await api.transactions.broadcast(createFixedDepositFor, {});

    await waitForHeight(releaseBlock + 1);

    const beforeClaim = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);

    const claimFixedFor = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claimFixedFor',
        args: [
          { type: 'string', value: this.wxAssetId },
          { type: 'string', value: user1 },
          { type: 'integer', value: releaseBlock },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(claimFixedFor, {});
    await ni.waitForTx(claimFixedFor.id, { apiBase });

    const afterClaim = await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);

    const diffBalance = afterClaim.balance - beforeClaim.balance;
    expect(diffBalance).equal(amount);
  });
});
