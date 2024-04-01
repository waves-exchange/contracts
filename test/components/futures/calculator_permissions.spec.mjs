import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data, invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcast, broadcastAndWait,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] futures: calculator permissions`, () => {
  let accounts;
  let rewardAmount;
  let assetId1;
  let assetId2;

  before(async () => {
    ({
      accounts, rewardAmount, assetId1, assetId2,
    } = await setup());

    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__${assetId1}__${assetId2}__pairAllowed`, type: 'boolean', value: true },
      ],
      chainId,
    }, accounts.factory.seed)).catch(({ message }) => { throw new Error(message); });
  });

  it('init', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'init',
        args: [
          { type: 'string', value: '' },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });

  it('request account', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'requestAccount',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.factory.publicKey))}` },
          {
            type: 'list',
            value: [
              { type: 'string', value: assetId1 },
              { type: 'string', value: assetId2 },
            ],
          },
        ],
      },
      payment: [
        { assetId: null, amount: rewardAmount },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });

  it('add account', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'addAccount',
        args: [
          { type: 'binary', value: 'base64:' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });

  it('deposit', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'deposit',
        args: [
          { type: 'binary', value: 'base64:' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });

  it('withdraw', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'withdraw',
        args: [
          { type: 'binary', value: 'base64:' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });

  it('set pair allowance', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'setPairAllowance',
        args: [
          { type: 'binary', value: 'base64:' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });

  it('do shutdown', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'doShutdown',
        args: [
          { type: 'binary', value: 'base64:' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });

  it('cancel shutdown', async () => {
    const fn = async (caller) => broadcast(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'cancelShutdown',
        args: [
          { type: 'binary', value: 'base64:' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, caller));

    await expect(fn(accounts.user1.seed)).to.be.rejectedWith('permission denied');
  });
});
