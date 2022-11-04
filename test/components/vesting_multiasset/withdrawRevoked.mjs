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
describe('vesting_multiasset: withdrawRevoked.mjs', /** @this {MochaSuiteModified} */() => {
  it('should correct do last claim after revoke', async function () {
    const vesting = address(this.accounts.vesting_multiasset, chainId);
    const user1 = address(this.accounts.user1, chainId);

    const currentHeight = await api.blocks.fetchHeight();
    const releaseBlock = currentHeight.height + 5;

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
    await ni.waitForTx(createFixedDepositFor.id, { apiBase });

    const revokeFixedDepositFor = invokeScript({
      dApp: vesting,
      payment: [{
        assetId: this.wxAssetId,
        amount,
      }],
      call: {
        function: 'revokeFixedDepositFor',
        args: [
          { type: 'string', value: this.wxAssetId },
          { type: 'string', value: user1 },
          { type: 'integer', value: releaseBlock },
        ],
      },
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(revokeFixedDepositFor, {});
    await ni.waitForTx(revokeFixedDepositFor.id, { apiBase });

    const withdrawRevoked = invokeScript({
      dApp: vesting,
      payment: [{
        assetId: this.wxAssetId,
        amount,
      }],
      call: {
        function: 'withdrawRevoked',
        args: [
          { type: 'string', value: this.wxAssetId },
        ],
      },
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(withdrawRevoked, {});
    const { stateChanges } = await ni.waitForTx(withdrawRevoked.id, { apiBase });

    expect(stateChanges.data).to.eql([
      { key: `%s%s__revokedTotal__${this.wxAssetId}`, type: 'integer', value: 0 },
    ]);
  });
});
