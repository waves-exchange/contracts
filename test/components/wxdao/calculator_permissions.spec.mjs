import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcast,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] wxdao: calculator permissions`, () => {
  let accounts;

  before(async () => {
    ({
      accounts,
    } = await setup());
  });

  it('swap', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'swap',
        args: [
          { type: 'binary', value: [] },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.factory.seed)).to.be.fulfilled;
  });

  it('lockInternal', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'lockInernal',
        args: [
          { type: 'binary', value: [] },
          { type: 'binary', value: [] },
          { type: 'integer', value: 0 },
          { type: 'integer', value: 0 },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.calculator.seed)).to.be.fulfilled;
  });

  it('unlock', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'unlock',
        args: [
          { type: 'binary', value: [] },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.factory.seed)).to.be.fulfilled;
  });

  it('price', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'unlock',
        args: [
          { type: 'binary', value: [] },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.factory.seed)).to.be.fulfilled;
  });

  it('priceDebug', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'unlock',
        args: [
          { type: 'binary', value: [] },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.factory.seed)).to.be.fulfilled;
  });

  it('getTreasuryValue', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'unlock',
        args: [
          { type: 'binary', value: [] },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      chainId,
    }, caller));

    expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
    expect(fn(accounts.factory.seed)).to.be.fulfilled;
  });
});
