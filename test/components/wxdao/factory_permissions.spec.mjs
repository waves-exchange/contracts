import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcast,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] wxdao: factory permissions`, () => {
  let accounts;

  before(async () => {
    ({
      accounts,
    } = await setup());
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
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
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
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
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
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('binaryEntry', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'binaryEntry',
        args: [
          { type: 'string', value: 'test' },
          { type: 'binary', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
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
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('reissue', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'reissue',
        args: [
          { type: 'binary', value: [] },
          { type: 'integer', value: 0 },
          { type: 'boolean', value: true },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('burn', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'burn',
        args: [
          { type: 'binary', value: [] },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('transferAsset', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'transferAsset',
        args: [
          { type: 'binary', value: [] },
          { type: 'integer', value: 0 },
          { type: 'binary', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('transferAssets', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'transferAssets',
        args: [
          { type: 'binary', value: [] },
          { type: 'list', value: [] },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('transferWaves', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'transferWaves',
        args: [
          { type: 'binary', value: [] },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('init', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'init',
        args: [
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'integer', value: 0 },
          { type: 'integer', value: 0 },
          { type: 'integer', value: 0 },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.factory.seed)).to.be.fulfilled;
  });

  it('commitAfterStartWithLockRoundFor', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'commitAfterStartWithLockRoundFor',
        args: [
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'string', value: '' },
          { type: 'integer', value: '' },
          { type: 'binary', value: '' },
          { type: 'integer', value: '' },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('call', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: '' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.fulfilled;
  });
});
