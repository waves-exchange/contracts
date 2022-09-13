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
describe('vesting_multiasset: createFixedDepositFor.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully createFixedDepositFor', async function () {
    const vesting = address(this.accounts.vesting_multiasset, chainId);
    const user1 = address(this.accounts.user1, chainId);

    const currentHeight = await api.blocks.fetchHeight();
    const releaseBlock = currentHeight + 10;
    const amount = 10000;

    const invokeTx = invokeScript({
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
    await api.transactions.broadcast(invokeTx, {});
    await ni.waitForTx(invokeTx.id, { apiBase });

    const { stateChanges } = await api.transactions.fetchInfo(invokeTx.id);
    expect(stateChanges.data).to.eql([{
      type: 'string',
      key: `%s%s%s%d__fixedDeposit__${this.wxAssetId}__${user1}__${releaseBlock}`,
      value: amount,
    }]);
  });
});
