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

const gatewayLabel = 'GATEWAY';

/** @typedef {Mocha.Suite & {accounts: Object.<string, number>}} MochaSuiteModified */
describe('Assets store - delete label', /** @this {MochaSuiteModified} */() => {
  let asset;
  before(async function () {
    const constructorInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.pools, chainId) }, // userPoolsContract
          { type: 'list', value: [{ type: 'string', value: gatewayLabel }] }, // labels
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(constructorInvokeTx, {});
    await waitForTx(constructorInvokeTx.id, { apiBase });

    const assetIssueTx = issue({
      name: 'base asset', description: '', quantity: 1e8, decimals: 8, chainId,
    }, seed);
    await api.transactions.broadcast(assetIssueTx, {});
    await waitForTx(assetIssueTx.id, { apiBase });
    asset = assetIssueTx.id;

    const createOrUpdateInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: asset }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: false }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(createOrUpdateInvokeTx, {});
    await waitForTx(createOrUpdateInvokeTx.id, { apiBase });
  });

  it('Should delete label', async function () {
    const addLabelInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'addLabel',
        args: [
          { type: 'string', value: asset }, // assetId
          { type: 'string', value: gatewayLabel }, // logo
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(addLabelInvokeTx, {});
    await waitForTx(addLabelInvokeTx.id, { apiBase });
    const addLabelTxInfo = await api.transactions.fetchInfo(addLabelInvokeTx.id);
    expect(addLabelTxInfo.stateChanges.data).to.eql([
      { key: `%s%s__labels__${asset}`, type: 'string', value: gatewayLabel },
    ]);

    const deleteLabelInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'deleteLabel',
        args: [
          { type: 'string', value: asset }, // assetId
          { type: 'string', value: gatewayLabel }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(deleteLabelInvokeTx, {});
    await waitForTx(deleteLabelInvokeTx.id, { apiBase });
    const { stateChanges } = await api.transactions.fetchInfo(deleteLabelInvokeTx.id);
    expect(stateChanges.data).to.eql([
      { key: `%s%s__labels__${asset}`, type: 'string', value: '' },
    ]);
  });
});
