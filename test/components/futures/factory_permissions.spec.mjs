import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, issue } from '@waves/waves-transactions';
import { base58Decode, base64Encode } from '@waves/ts-lib-crypto';
import {
  chainId, broadcast, broadcastAndWait,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] futures: factory permissions`, () => {
  let accounts;
  let assetId;

  before(async () => {
    ({
      accounts,
    } = await setup());

    ({ id: assetId } = await broadcastAndWait(issue({
      name: 'ASSET',
      description: '',
      quantity: 1e6 * 1e8,
      decimals: 8,
      reissuable: true,
      chainId,
    }, accounts.factory.seed)));
  });

  it('stringEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
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
    await fn(accounts.calculator.seed);
  });

  it('integerEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
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
      dApp: accounts.factory.address,
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
      dApp: accounts.factory.address,
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
      dApp: accounts.factory.address,
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
      dApp: accounts.factory.address,
      call: {
        function: 'reissue',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetId))}` },
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
      dApp: accounts.factory.address,
      call: {
        function: 'burn',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetId))}` },
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
      dApp: accounts.factory.address,
      call: {
        function: 'transferAsset',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.calculator.address))}` },
          { type: 'integer', value: 1 },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetId))}` },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('transferAssets', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'transferAssets',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.calculator.address))}` },
          { type: 'list', value: [] },
          { type: 'list', value: [] },
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
      dApp: accounts.factory.address,
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
      dApp: accounts.factory.address,
      call: {
        function: 'init',
        args: [
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'binary', value: 'base64:' },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    await expect(fn(accounts.factory.seed)).to.be.fulfilled;
  });
});
