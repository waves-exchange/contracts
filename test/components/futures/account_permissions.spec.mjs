import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import {
  data, invokeScript, issue, setScript,
} from '@waves/waves-transactions';
import {
  base58Decode, base64Encode,
} from '@waves/ts-lib-crypto';
import {
  chainId, broadcastAndWait, api, broadcast,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] futures: account permissions`, () => {
  let accounts;
  let assetIdOwned;
  let rewardAmount;
  let assetId1;
  let assetId2;
  let validScript;

  before(async () => {
    ({
      accounts, rewardAmount, assetId1, assetId2,
    } = await setup());

    ({ id: assetIdOwned } = await broadcastAndWait(issue({
      name: 'ASSET',
      description: '',
      quantity: 1e6 * 1e8,
      decimals: 8,
      reissuable: true,
      chainId,
    }, accounts.account1.seed)));

    const kAccountScript = '%s__accountScript';
    validScript = await api.addresses.fetchDataKey(
      accounts.factory.address,
      kAccountScript,
    ).then(({ value }) => value);

    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__${assetId1}__${assetId2}__pairAllowed`, type: 'boolean', value: true },
      ],
      additionalFee: 4e5,
      chainId,
    }, accounts.factory.seed));

    await broadcastAndWait(setScript({
      script: validScript,
      chainId,
    }, accounts.account1.seed));

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'requestAccount' },
          {
            type: 'list',
            value: [
              { type: 'string', value: assetId1 },
              { type: 'string', value: assetId2 },
              { type: 'string', value: '2' },
            ],
          },
        ],
      },
      payment: [
        { assetId: null, amount: rewardAmount },
      ],
      chainId,
    }, accounts.user1.seed));

    await broadcastAndWait(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'init',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.factory.publicKey))}` },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}` },
        ],
      },
      payment: [],
      chainId,
      additionalFee: 4e5,
    }, accounts.account1.seed));
  });

  it('stringEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'stringEntry',
        args: [
          { type: 'string', value: 'test' },
          { type: 'string', value: 'test' },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('integerEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'integerEntry',
        args: [
          { type: 'string', value: 'test' },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('booleanEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'booleanEntry',
        args: [
          { type: 'string', value: 'test' },
          { type: 'boolean', value: true },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('binaryEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'binaryEntry',
        args: [
          { type: 'string', value: 'test' },
          { type: 'binary', value: 'base64:' },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('deleteEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'deleteEntry',
        args: [
          { type: 'string', value: 'test' },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('reissue', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'reissue',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetIdOwned))}` },
          { type: 'integer', value: 0 },
          { type: 'boolean', value: true },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('burn', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'burn',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetIdOwned))}` },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('transferAsset', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'transferAsset',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.calculator.address))}` },
          { type: 'integer', value: 1 },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetIdOwned))}` },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('transferWaves', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'transferWaves',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.calculator.address))}` },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('init', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'init',
        args: [
          { type: 'binary', value: 'base64:' },
          { type: 'binary', value: 'base64:' },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.account1.seed)).to.be.rejectedWith('Transaction is not allowed by account-script');
  });
});
