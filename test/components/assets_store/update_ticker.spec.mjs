import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue,
} from '@waves/waves-transactions';
import { broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const { CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env;

const keyAssetIdToTicker = (assetId) => `%s%s__assetId2ticker__${assetId}`;
const keyTickerToAssetId = (ticker) => `%s%s__ticker2assetId__${ticker}`;

/** @typedef {Mocha.Suite & {accounts: Object.<string, number>}} MochaSuiteModified */
describe('Assets store - update ticker', /** @this {MochaSuiteModified} */() => {
  /** @type {string} */
  let assetId1;
  let assetId2;
  const ticker1 = 'ticker1';
  const ticker2 = 'ticker2';
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
    await broadcastAndWait(constructorInvokeTx);

    ({ id: assetId1 } = await broadcastAndWait(issue({
      name: 'asset 1', description: '', quantity: 1e8, decimals: 8, chainId,
    }, baseSeed)));

    ({ id: assetId2 } = await broadcastAndWait(issue({
      name: 'asset 2', description: '', quantity: 1e8, decimals: 8, chainId,
    }, baseSeed)));

    await broadcastAndWait(invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: assetId1 }, // assetId
          { type: 'string', value: '' }, // logo
          { type: 'boolean', value: false }, // verified
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store));

    await broadcastAndWait(invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'createOrUpdate',
        args: [
          { type: 'string', value: assetId2 },
          { type: 'string', value: '' },
          { type: 'boolean', value: false },
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store));
  });

  it('Should set ticker', async function () {
    const addLabelInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'updateTicker',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: ticker1 },
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    const { stateChanges } = await broadcastAndWait(addLabelInvokeTx);

    expect(stateChanges.data).to.eql([
      {
        key: keyAssetIdToTicker(assetId1),
        type: 'string',
        value: ticker1,
      },
      {
        key: keyTickerToAssetId(ticker1),
        type: 'string',
        value: assetId1,
      },
    ]);
  });

  it('Should update ticker and remove old one', async function () {
    const addLabelInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'updateTicker',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: ticker2 },
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    const { stateChanges } = await broadcastAndWait(addLabelInvokeTx);

    expect(stateChanges.data).to.eql([
      { key: keyTickerToAssetId(ticker1), value: null },
      {
        key: keyAssetIdToTicker(assetId1),
        type: 'string',
        value: ticker2,
      },
      {
        key: keyTickerToAssetId(ticker2),
        type: 'string',
        value: assetId1,
      },
    ]);
  });

  it('Should update assetId and remove old one', async function () {
    const addLabelInvokeTx = invokeScript({
      dApp: address(this.accounts.store, chainId),
      call: {
        function: 'updateTicker',
        args: [
          { type: 'string', value: assetId2 },
          { type: 'string', value: ticker2 },
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.store);
    const { stateChanges } = await broadcastAndWait(addLabelInvokeTx);

    expect(stateChanges.data).to.eql([
      { key: keyAssetIdToTicker(assetId1), value: null },
      {
        key: keyAssetIdToTicker(assetId2),
        type: 'string',
        value: ticker2,
      },
      {
        key: keyTickerToAssetId(ticker2),
        type: 'string',
        value: assetId2,
      },
    ]);
  });
});
