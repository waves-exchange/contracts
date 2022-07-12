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

describe('User Pools - Constructor', /** @this {MochaSuiteModified} */() => {
  it('Invalid caller', async function () {
    const invokeTx = invokeScript({
      dApp: address(this.accounts.pools, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.factory, chainId) }, // factoryV2Address
          { type: 'string', value: address(this.accounts.store, chainId) }, // assetsStoreAddress
          { type: 'list', value: [{ type: 'string', value: this.usdnAssetId }] }, // priceAssetIds: List[String]
          { type: 'list', value: [{ type: 'string', value: '1000' }] }, // priceAssetsMinAmount: List[String]
          { type: 'integer', value: 1000 }, // amountAssetMinAmount
          { type: 'string', value: this.wxAssetId }, // feeAssetId
          { type: 'integer', value: 1000 }, // feeAmount
        ],
      },
      chainId,
    }, this.accounts.user);
    return expect(api.transactions.broadcast(invokeTx, {})).to.be.rejectedWith('Permission denied');
  });

  it('Valid caller', async function () {
    const invokeTx = invokeScript({
      dApp: address(this.accounts.pools, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.factory, chainId) }, // factoryV2Address
          { type: 'string', value: address(this.accounts.store, chainId) }, // assetsStoreAddress
          { type: 'list', value: [{ type: 'string', value: this.usdnAssetId }] }, // priceAssetIds: List[String]
          { type: 'list', value: [{ type: 'string', value: '1000' }] }, // priceAssetsMinAmount: List[String]
          { type: 'integer', value: 1000 }, // amountAssetMinAmount
          { type: 'string', value: this.wxAssetId }, // feeAssetId
          { type: 'integer', value: 1000 }, // feeAmount
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.pools);
    return expect(api.transactions.broadcast(invokeTx, {})).to.be.fulfilled;
  });
});
