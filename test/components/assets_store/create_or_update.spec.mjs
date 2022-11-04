import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, nodeInteraction,
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

describe('Assets store - createOrUpdate', /** @this {MochaSuiteModified} */() => {
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
  });

  it('Invalid asset id', async function () {
    const createOrUpdateInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: 'invalidAssetId' }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: false }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    expect(api.transactions.broadcast(createOrUpdateInvokeTx, {})).to.be.rejectedWith('Invalid asset ID');
  });

  it('If verified then COMMUNITY_VERIFIED should be added', async function () {
    const amountAssetIssueTx = issue({
      name: 'base asset', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(amountAssetIssueTx, {});
    await waitForTx(amountAssetIssueTx.id, { apiBase });
    const assetId = amountAssetIssueTx.id;
    const createOrUpdateInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: assetId }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: true }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(createOrUpdateInvokeTx, {});
    await waitForTx(createOrUpdateInvokeTx.id, { apiBase });
    const { stateChanges } = await api.transactions.fetchInfo(createOrUpdateInvokeTx.id);
    expect(stateChanges.data).to.eql([
      { key: `created_<${assetId}>`, type: 'boolean', value: true },
      { key: `status_<${assetId}>`, type: 'integer', value: 2 },
      { key: `%s%s__labels__${assetId}`, type: 'string', value: 'COMMUNITY_VERIFIED' },
    ]);
  });

  it('If not verified then COMMUNITY_VERIFIED shouldn\'t be added', async function () {
    const amountAssetIssueTx = issue({
      name: 'base asset', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(amountAssetIssueTx, {});
    await waitForTx(amountAssetIssueTx.id, { apiBase });
    const assetId = amountAssetIssueTx.id;
    const createOrUpdateInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: assetId }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: false }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(createOrUpdateInvokeTx, {});
    await waitForTx(createOrUpdateInvokeTx.id, { apiBase });
    const { stateChanges } = await api.transactions.fetchInfo(createOrUpdateInvokeTx.id);
    expect(stateChanges.data).to.eql([
      { key: `created_<${assetId}>`, type: 'boolean', value: true },
      { key: `status_<${assetId}>`, type: 'integer', value: 0 },
      { key: `%s%s__labels__${assetId}`, type: 'string', value: '' },
    ]);
  });
});
