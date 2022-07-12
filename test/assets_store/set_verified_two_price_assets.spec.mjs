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

describe('Assets store - setVerified (two price assets)', /** @this {MochaSuiteModified} */() => {
  let amountAsset; let priceAsset1; let priceAsset2;
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

    const amountAssetIssueTx = issue({
      name: 'base asset', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(amountAssetIssueTx, {});
    await waitForTx(amountAssetIssueTx.id, { apiBase });
    amountAsset = amountAssetIssueTx.id;

    const priceAssetIssueTx1 = issue({
      name: 'price asset #1', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(priceAssetIssueTx1, {});
    await waitForTx(priceAssetIssueTx1.id, { apiBase });
    priceAsset1 = priceAssetIssueTx1.id;

    const priceAssetIssueTx2 = issue({
      name: 'price asset #2', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(priceAssetIssueTx2, {});
    await waitForTx(priceAssetIssueTx2.id, { apiBase });
    priceAsset2 = priceAssetIssueTx2.id;

    const createOrUpdateInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: amountAsset }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: false }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(createOrUpdateInvokeTx, {});
    await waitForTx(createOrUpdateInvokeTx.id, { apiBase });

    const setPriceAssetDataTx = data({
      data: [
        { key: 'priceAssets', type: 'string', value: `${priceAsset1}__${priceAsset2}` },
      ],
      chainId,
    }, this.accounts.pools);
    await api.transactions.broadcast(setPriceAssetDataTx, {});
    await waitForTx(setPriceAssetDataTx.id, { apiBase });
  });

  it('Without linked lp tokens', async function () {
    const setVerifiedInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'setVerified',
        args: [
          { type: 'string', value: amountAsset }, // assetId
          { type: 'boolean', value: true }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(setVerifiedInvokeTx, {});
    await waitForTx(setVerifiedInvokeTx.id, { apiBase });
    const { stateChanges } = await api.transactions.fetchInfo(setVerifiedInvokeTx.id);
    expect(stateChanges.data).to.eql([
      { key: `status_<${amountAsset}>`, type: 'integer', value: 2 },
      { key: `%s%s__labels__${amountAsset}`, type: 'string', value: 'COMMUNITY_VERIFIED' },
    ]);
  });
});
