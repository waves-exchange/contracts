import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { data, invokeScript } from '@waves/waves-transactions';
import { api, broadcastAndWait, chainId } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import {
  confirmTransaction, init, kMultisig,
} from './contract/multisig.mjs';
import { setScriptFromFile } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] multisig: set multisig`, () => {
  let accounts;

  before(async () => {
    ({ accounts } = await setup());

    const owners = [
      accounts.admin0.publicKey,
      accounts.admin1.publicKey,
      accounts.admin2.publicKey,
    ];
    const quorum = 1;

    await init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    });

    await setScriptFromFile(
      'components/multisig/mock/dapp.ride',
      accounts.dapp.seed,
    );
  });

  it('tx allowed if multisig is not set', async () => {
    await expect(broadcastAndWait(data({
      data: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.dapp.seed))).to.be.fulfilled;
  });

  it('admin function should throw if multisig is not set', async () => {
    await expect(broadcastAndWait(invokeScript({
      dApp: accounts.dapp.address,
      call: {
        function: 'test',
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.dapp.seed))).to.be.rejectedWith('value by key \'%s__multisig\' not found');
  });

  it('set multisig should throw if caller is not this', async () => {
    await expect(broadcastAndWait(invokeScript({
      dApp: accounts.dapp.address,
      call: {
        function: 'setMultisig',
        args: [
          { type: 'string', value: accounts.multisig.address },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.admin0.seed))).to.be.rejectedWith('permission denied');
  });

  it('set multisig should throw if address is not valid', async () => {
    await expect(broadcastAndWait(invokeScript({
      dApp: accounts.dapp.address,
      call: {
        function: 'setMultisig',
        args: [
          { type: 'string', value: '1111' },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.dapp.seed))).to.be.rejectedWith('setMultisig: invalid multisig address');
  });

  it('should successfully set multisig', async () => {
    await expect(broadcastAndWait(invokeScript({
      dApp: accounts.dapp.address,
      call: {
        function: 'setMultisig',
        args: [
          { type: 'string', value: accounts.multisig.address },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.dapp.seed))).to.be.fulfilled;

    const [
      { value: multisig },
    ] = await api.addresses.data(
      accounts.dapp.address,
      {
        key: [
          encodeURIComponent(kMultisig),
        ],
      },
    );

    expect(multisig).to.equal(accounts.multisig.address);
  });

  it('tx should throw if not confirmed', async () => {
    await expect(broadcastAndWait(data({
      data: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.dapp.seed))).to.be.rejectedWith('Transaction is not allowed by account-script');
  });

  it('admin function should throw if invalid caller', async () => {
    await expect(broadcastAndWait(invokeScript({
      dApp: accounts.dapp.address,
      call: {
        function: 'test',
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.admin3.seed))).to.be.rejectedWith('not allowed');
  });

  it('successfully call admin function', async () => {
    await expect(broadcastAndWait(invokeScript({
      dApp: accounts.dapp.address,
      call: {
        function: 'test',
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.admin0.seed))).to.be.fulfilled;
  });

  it('should successfully set multisig again if confirmed', async () => {
    const tx = invokeScript({
      dApp: accounts.dapp.address,
      call: {
        function: 'setMultisig',
        args: [
          { type: 'string', value: accounts.multisig.address },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.dapp.seed);

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address: accounts.dapp.address,
      txId: tx.id,
    });

    await expect(broadcastAndWait(tx)).to.be.fulfilled;
  });
});
