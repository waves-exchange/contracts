import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, data, nodeInteraction, transfer,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const { waitForTx } = nodeInteraction;

const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, wxAssetId: string, usdnAssetId: string}
 * } MochaSuiteModified
 * */

describe('User Pools - Create', /** @this {MochaSuiteModified} */() => {
  let userTokenId = '';
  before(async function () {
    const constructorInvokeTx = invokeScript({
      dApp: address(this.accounts.pools, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.factory, chainId) }, // factoryV2Address
          { type: 'string', value: address(this.accounts.store, chainId) }, // assetsStoreAddress
          { type: 'string', value: address(this.accounts.emission, chainId) }, // emissionAddress
          { type: 'list', value: [{ type: 'string', value: '1000' }] }, // priceAssetsMinAmount: List[String]
          { type: 'integer', value: 1000 }, // amountAssetMinAmount
          { type: 'string', value: this.wxAssetId }, // feeAssetId
          { type: 'integer', value: 1000 }, // feeAmount
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.pools);
    await api.transactions.broadcast(constructorInvokeTx, {});
    await waitForTx(constructorInvokeTx.id, { apiBase });

    const userTokenIssueTx = issue({
      name: 'user token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, this.accounts.user);
    await api.transactions.broadcast(userTokenIssueTx, {});
    await waitForTx(userTokenIssueTx.id, { apiBase });
    userTokenId = userTokenIssueTx.id;

    const statusVerified = 2;
    const verifyTokenDataTx = data({
      data: [
        { key: `status_<${userTokenId}>`, type: 'integer', value: statusVerified },
      ],
      chainId,
    }, this.accounts.store);
    await api.transactions.broadcast(verifyTokenDataTx, {});
    await waitForTx(verifyTokenDataTx.id, { apiBase });

    const usdnTransferTx = transfer({
      amount: 1e8,
      recipient: address(this.accounts.user, chainId),
      assetId: this.usdnAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(usdnTransferTx, {});
    await waitForTx(usdnTransferTx.id, { apiBase });

    const wxTransferTx = transfer({
      amount: 1e8,
      recipient: address(this.accounts.user, chainId),
      assetId: this.wxAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(wxTransferTx, {});
    await waitForTx(wxTransferTx.id, { apiBase });
  });

  it('Create burns WX fee', async function () {
    const createInvokeTx = invokeScript({
      dApp: address(this.accounts.pools, chainId),
      call: {
        function: 'create',
        args: [],
      },
      payment: [
        { amount: 1e8, assetId: userTokenId },
        { amount: 1e8, assetId: this.usdnAssetId },
        { amount: 1e3, assetId: this.wxAssetId },
      ],
      fee: 9e5,
      chainId,
    }, this.accounts.user);
    await api.transactions.broadcast(createInvokeTx, {});
    await waitForTx(createInvokeTx.id, { apiBase });

    const { stateChanges } = await api.transactions.fetchInfo(createInvokeTx.id);
    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.emission, chainId), 'burn'],
      ]);
    expect(stateChanges.invokes[0].payment).to.deep.include({
      assetId: this.wxAssetId,
      amount: 1e3,
    });
  });
});