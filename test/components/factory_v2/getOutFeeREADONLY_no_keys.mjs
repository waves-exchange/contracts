import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { address } from '@waves/ts-lib-crypto';
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

describe('factory_v2: getOutFeeREADONLY_no_keys.mjs', /** @this {MochaSuiteModified} */() => {
  it('getOutFeeREADONLY without keys should return fee value 100000 from contract', async function () {
    const factoryAddress = address(this.accounts.factory, chainId);
    const lpAddress = address(this.accounts.lp, chainId);
    const expectedFee = 100000;

    const expr = `getOutFeeREADONLY("${lpAddress}")`;
    const response = await api.utils.fetchEvaluate(factoryAddress, expr);
    const checkData = response.result.value._2.value; /* eslint-disable-line */
    expect(checkData).to.be.eq(expectedFee);
  });
});
