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
describe('vesting_multiasset: claimFixedREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully createDepositFor and claimFixedREADONLY', async function () {
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
    await ni.waitForTx(createFixedDepositFor.id, { apiBase });

    await waitForHeight(releaseBlock + 1);

    const expr = `claimFixedREADONLY(\"${this.wxAssetId}\", \"${user1}\", ${releaseBlock})`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(vesting, expr);
    const checkData = response.result.value._2.value;  /* eslint-disable-line */

    expect(checkData).to.eql(amount); /* eslint-disable-line */
  });
});
