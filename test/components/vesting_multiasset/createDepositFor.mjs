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
describe('vesting_multiasset: createDepositFor.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully createDepositFor', async function () {
    const vesting = address(this.accounts.vesting_multiasset, chainId);
    const user1 = address(this.accounts.user1, chainId);

    const invokeTx = invokeScript({
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
    await api.transactions.broadcast(invokeTx, {});
    const { height } = await ni.waitForTx(invokeTx.id, { apiBase });

    const [
      keyUser,
      keyUserVestingStart,
      keyUserVestingEnd,
      keyUserAmountPerBlock,
    ] = await Promise.all([
      api.addresses.fetchDataKey(
        vesting,
        `%s%s__${this.wxAssetId}__${user1}`,
      ),
      api.addresses.fetchDataKey(
        vesting,
        `%s%s%s__vestingStart__${this.wxAssetId}__${user1}`,
      ),
      api.addresses.fetchDataKey(
        vesting,
        `%s%s%s__vestingEnd__${this.wxAssetId}__${user1}`,
      ),
      api.addresses.fetchDataKey(
        vesting,
        `%s%s%s__amountPerBlock__${this.wxAssetId}__${user1}`,
      ),
    ]);

    expect(keyUser.value).equal(`%d%d%d%d%d__10000__10000__0__0__${height}`);
    expect(keyUserVestingStart.value).equal(height);
    expect(keyUserVestingEnd.value).equal(height + 5000);
    expect(keyUserAmountPerBlock.value).equal(2);
  });
});
