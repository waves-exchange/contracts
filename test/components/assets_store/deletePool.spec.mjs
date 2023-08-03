import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, data, nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const { waitForTx } = nodeInteraction;

const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';

const api = create(apiBase);

/** @typedef {Mocha.Suite & {accounts: Object.<string, number>}} MochaSuiteModified */

describe('Assets store - delete pool lp token', /** @this {MochaSuiteModified} */() => {
  let amountAsset; let priceAsset; let lpAssetId;
  before(async function () {
    const constructorInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.pools, chainId) }, // userPoolsContract
          { type: 'list', value: [] }, // labels
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(constructorInvokeTx, {});
    await waitForTx(constructorInvokeTx.id, { apiBase });

    const constructor2InvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'constructorV2',
        args: [
          { type: 'string', value: address(this.accounts.factory, chainId) }, // factoryContract
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(constructor2InvokeTx, {});
    await waitForTx(constructor2InvokeTx.id, { apiBase });

    const amountAssetIssueTx = issue({
      name: 'amount asset', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(amountAssetIssueTx, {});
    await waitForTx(amountAssetIssueTx.id, { apiBase });
    amountAsset = amountAssetIssueTx.id;

    const priceAssetIssueTx = issue({
      name: 'price asset', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(priceAssetIssueTx, {});
    await waitForTx(priceAssetIssueTx.id, { apiBase });
    priceAsset = priceAssetIssueTx.id;

    const lpAssetIssueTx = issue({
      name: 'lp asset', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(lpAssetIssueTx, {});
    await waitForTx(lpAssetIssueTx.id, { apiBase });
    lpAssetId = lpAssetIssueTx.id;

    const createOrUpdateInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: amountAsset }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: true }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(createOrUpdateInvokeTx, {});
    await waitForTx(createOrUpdateInvokeTx.id, { apiBase });

    const createOrUpdateLpAssetInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: lpAssetId }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: true }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(createOrUpdateLpAssetInvokeTx, {});
    await waitForTx(createOrUpdateLpAssetInvokeTx.id, { apiBase });

    const setPriceAssetDataTx = data({
      data: [
        { key: 'priceAssets', type: 'string', value: priceAsset },
      ],
      chainId,
    }, this.accounts.pools);
    await api.transactions.broadcast(setPriceAssetDataTx, {});
    await waitForTx(setPriceAssetDataTx.id, { apiBase });

    const linlPoolAssetsToLp = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'addAssetsLink',
        args: [
          { type: 'string', value: amountAsset },
          { type: 'string', value: priceAsset },
          { type: 'string', value: lpAssetId },
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(linlPoolAssetsToLp, {});
    await waitForTx(linlPoolAssetsToLp.id, { apiBase });
  });

  it('Without linked lp tokens', async function () {
    const deletePoolTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'deletePool',
        args: [
          { type: 'string', value: amountAsset },
          { type: 'string', value: priceAsset },
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(deletePoolTx, {});
    await waitForTx(deletePoolTx.id, { apiBase });
    const { stateChanges } = await api.transactions.fetchInfo(deletePoolTx.id);

    expect(stateChanges.data).to.eql([
      { key: `%s%s__lpAssetToAmountAndPriceAssets__${lpAssetId}`, value: null },
      { key: `%s%s__labels__${lpAssetId}`, value: null },
      { key: `%s%s__assetName__${lpAssetId}`, value: null },
      { key: `%s%s__assetDescription__${lpAssetId}`, value: null },
      { key: `created_<${lpAssetId}>`, value: null },
      { key: `status_<${lpAssetId}>`, value: null },
      { key: `logo_<${lpAssetId}>`, value: null },
      { key: `ticker_<${lpAssetId}>`, value: null },
      { key: `%s%s%s__amountAndPriceAssetsToLpAsset__${amountAsset}__${priceAsset}`, value: null },
    ]);
  });
});
