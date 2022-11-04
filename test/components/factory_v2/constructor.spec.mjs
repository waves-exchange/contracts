import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, wxAssetId: string, usdnAssetId: string}
 * } MochaSuiteModified
 * */

describe('Factory V2 - Constructor', /** @this {MochaSuiteModified} */() => {
  it('Invalid caller', async function () {
    const invokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: '' }, // stakingContract
          { type: 'string', value: '' }, // boostingContract
          { type: 'string', value: '' }, // idoContract
          { type: 'string', value: '' }, // teamContract
          { type: 'string', value: '' }, // emissionContract
          { type: 'string', value: '' }, // restContract
          { type: 'string', value: '' }, // slpipageContract
          { type: 'integer', value: 0 }, // priceDecimals
        ],
      },
      chainId,
    }, this.accounts.user);
    return expect(api.transactions.broadcast(invokeTx, {})).to.be.rejectedWith('Permission denied');
  });

  it('Valid', async function () {
    const invokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: '' }, // stakingContract
          { type: 'string', value: '' }, // boostingContract
          { type: 'string', value: '' }, // idoContract
          { type: 'string', value: '' }, // teamContract
          { type: 'string', value: '' }, // emissionContract
          { type: 'string', value: '' }, // restContract
          { type: 'string', value: '' }, // slpipageContract
          { type: 'integer', value: 0 }, // priceDecimals
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(invokeTx, {});
  });
});
