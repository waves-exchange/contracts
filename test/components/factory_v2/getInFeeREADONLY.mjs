import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { address } from '@waves/ts-lib-crypto';
import { waitForTx, data } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';
const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>}
 * } MochaSuiteModified
 * */

describe('factory_v2: getInFeeREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  before(async function () {
    const dataTx = data({
      chainId,
      fee: 500000,
      data: [{
        key: '%s__inFeeDefault',
        type: 'integer',
        value: '123456',
      },
      {
        key: `%s%s__inFee__${address(this.accounts.lp, chainId)}`,
        type: 'integer',
        value: '234567',
      }],
    }, this.accounts.factory);
    await api.transactions.broadcast(dataTx, {});
    await waitForTx(dataTx.id, { apiBase });
  });
  it('getInFeeREADONLY should return lp in fee or default in fee', async function () {
    const factoryAddress = address(this.accounts.factory, chainId);
    const lpAddress = address(this.accounts.lp, chainId);
    const expectedDefaultFee = 123456;
    const expectedFee = 234567;

    // Should return %s%s__inFee__${address} key value
    const expr1 = `getInFeeREADONLY("${lpAddress}")`;
    const response1 = await api.utils.fetchEvaluate(factoryAddress, expr1);
    const checkData1 = response1.result.value._2.value; /* eslint-disable-line */
    expect(checkData1).to.be.eq(expectedFee);

    // Should fallback to %s__inFeeDefault key value
    const expr2 = `getInFeeREADONLY("${factoryAddress}")`;
    const response2 = await api.utils.fetchEvaluate(factoryAddress, expr2);
    const checkData2 = response2.result.value._2.value; /* eslint-disable-line */
    expect(checkData2).to.be.eq(expectedDefaultFee);
  });
});
