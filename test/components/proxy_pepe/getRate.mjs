import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('proxy_pepe: getRate.mjs', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully getRate as Integer',
    async function () {
      const proxyPepe = address(this.accounts.proxyPepe, chainId);
      const { result } = await api.utils.fetchEvaluate(proxyPepe, 'getRate()');
      console.log(result.value._2);
      expect(result.value._2).to.eql({
        type: 'Int',
        value: 1.5e12,
      });
    },
  );
});
