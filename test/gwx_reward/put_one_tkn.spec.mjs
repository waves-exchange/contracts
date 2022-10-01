import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
// const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>}
 * } MochaSuiteModified
 * */

describe('put one tkn', /** @this {MochaSuiteModified} */() => {
  it('put x', async function () {
    const S = 100000000 - 100000;
    const X = '464684764848';
    const Y = '8541956133770';
    const amp = '1000';
    const aPrecision = '100';
    const targetXPrecision = '1';
    const targetDPrecision = '1';
    const expr = `calcPutXOnly("${S}", "${X}", "${Y}", "", "${amp}", "${aPrecision}", "${targetXPrecision}", "${targetDPrecision}")`;
    const response = await api.utils.fetchEvaluate(address(this.accounts.math, chainId), expr);
    // 5380474
    console.log(JSON.stringify(response, null, 2));
  });

  it('put y', async function () {
    const S = 100000000 - 100000;
    const X = '8541956133770';
    const Y = '464684764848';
    const amp = '1000';
    const aPrecision = '100';
    const targetXPrecision = '1';
    const targetDPrecision = '1';
    const expr = `calcPutXOnly("${S}", "${X}", "${Y}", "", "${amp}", "${aPrecision}", "${targetXPrecision}", "${targetDPrecision}")`;
    const response = await api.utils.fetchEvaluate(address(this.accounts.math, chainId), expr);
    // 94519479
    console.log(JSON.stringify(response, null, 2));
  });

  it('swap x', async function () {
    const x = 100000000;
    const X = '464684764848';
    const Y = '8541956133797';
    const amp = '1000';
    const aPrecision = '100';
    const targetXPrecision = '1';
    const targetDPrecision = '1';
    const expr = `calcSwapXToY("${x}", "${X}", "${Y}", "", "${amp}", "${aPrecision}", "${targetXPrecision}", "${targetDPrecision}")`;
    const response = await api.utils.fetchEvaluate(address(this.accounts.math, chainId), expr);
    // 104639984
    console.log(JSON.stringify(response, null, 2));
  });

  it('swap y', async function () {
    const y = 100000000;
    const X = '8541956133797';
    const Y = '464584864848';
    const amp = '1000';
    const aPrecision = '100';
    const targetXPrecision = '1';
    const targetDPrecision = '1';
    const expr = `calcSwapXToY("${y}", "${X}", "${Y}", "", "${amp}", "${aPrecision}", "${targetXPrecision}", "${targetDPrecision}")`;
    const response = await api.utils.fetchEvaluate(address(this.accounts.math, chainId), expr);
    // 95563979
    console.log(JSON.stringify(response, null, 2));
  });

  it('calc D', async function () {
    const X = '464584864848';
    const Y = '8541956133797';
    const amp = '1000';
    const aPrecision = '100';
    const targetDPrecision = '1';
    const expr = `calcD("${X}", "${Y}", "${amp}", "${aPrecision}", "${targetDPrecision}")`;
    const response = await api.utils.fetchEvaluate(address(this.accounts.math, chainId), expr);
    console.log(JSON.stringify(response, null, 2));
    // works well! 8988163273281
  });
});
