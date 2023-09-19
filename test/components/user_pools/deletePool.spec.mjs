import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const { waitForTx } = nodeInteraction;

const apiBase = process.env.API_NODE_URL;
// const seed = 'waves private node seed with waves tokens';
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, wxAssetId: string, usdnAssetId: string}
 * } MochaSuiteModified
 * */

describe('User Pools - Delete Pool', /** @this {MochaSuiteModified} */() => {
  before(async function () {
    const constructorInvokeTx = invokeScript({
      dApp: address(this.accounts.pools, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.factory, chainId) }, // factoryV2Address
          { type: 'string', value: address(this.accounts.store, chainId) }, // assetsStoreAddress
          { type: 'string', value: address(this.accounts.emission, chainId) }, // emissionAddress
          { type: 'string', value: this.wxAssetId }, // feeAssetId
          { type: 'integer', value: 1000 }, // feeAmount
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.pools);
    await api.transactions.broadcast(constructorInvokeTx, {});
    await waitForTx(constructorInvokeTx.id, { apiBase });
  });

  it('deletePool shoud delete keys', async function () {
    const deletePoolInvokeTx = invokeScript({
      dApp: address(this.accounts.pools, chainId),
      call: {
        function: 'deletePool',
        args: [
          { type: 'string', value: 'AmountAssetId' },
          { type: 'string', value: 'PriceAssetId' },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, this.accounts.pools);

    await api.transactions.broadcast(deletePoolInvokeTx, {});
    const { stateChanges } = await waitForTx(deletePoolInvokeTx.id, { apiBase });

    expect(stateChanges.data).to.deep.eql([
      { key: '%s%s%s__createCalled__AmountAssetId__PriceAssetId', value: null },
      { key: '%s%s%s__createCaller__AmountAssetId__PriceAssetId', value: null },
      { key: '%s%s%s__suffix__AmountAssetId__PriceAssetId', value: null },
      { key: '%s%s%s__height__AmountAssetId__PriceAssetId', value: null },
      { key: '%s%s%s__status__AmountAssetId__PriceAssetId', value: null },
      { key: '%s%s%s__amountAssetAmount__AmountAssetId__PriceAssetId', value: null },
      { key: '%s%s%s__priceAssetAmount__AmountAssetId__PriceAssetId', value: null },
      { key: '%s%s%s__poolType__AmountAssetId__PriceAssetId', value: null },
    ]);
  });
});
