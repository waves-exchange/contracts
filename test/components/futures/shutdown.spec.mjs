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
  chainId, broadcastAndWait, api,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import { confirmTransaction, init } from '../multisig/contract/multisig.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] futures: shutdown`, () => {
  let accounts;
  let assetId1;
  let assetId2;
  let validScript;

  before(async () => {
    ({
      accounts, assetId1, assetId2,
    } = await setup());

    const owners = [
      accounts.admin1.publicKey,
    ];
    const quorum = 1;

    await init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    });

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
      chainId,
    }, accounts.factory.seed));

    await broadcastAndWait(setScript({
      script: validScript,
      chainId,
    }, accounts.account1.seed));

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

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'setMultisig',
        args: [
          { type: 'string', value: accounts.multisig.address },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, accounts.factory.seed));
  });

  it('doShutdown should throw if not admin', async () => {
    const tx = invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'doShutdown' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.user1.seed);

    await expect(broadcastAndWait(tx)).to.be.rejectedWith('not allowed');
  });

  it('successfully do shutdown', async () => {
    const tx = invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'doShutdown' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.admin1.seed);

    await expect(broadcastAndWait(tx)).to.be.fulfilled;
  });

  it('transferWaves in account should throw if shutdown', async () => {
    const tx = invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'transferWaves',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.calculator.address))}` },
          { type: 'integer', value: 1 },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.calculator.seed);

    await expect(broadcastAndWait(tx)).to.be.rejectedWith('not allowed');
  });

  it('deposit should throw if shutdown', async () => {
    const tx = invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'deposit' },
          { type: 'list', value: [] },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.user1.seed);

    await expect(broadcastAndWait(tx)).to.be.rejectedWith('not allowed');
  });

  it('successfully cancel shutdown', async () => {
    const tx = data({
      data: [
        { key: '%s__shutdown' },
      ],
      additionalFee: 4e5,
      chainId,
    }, accounts.factory.seed);

    await expect(broadcastAndWait(tx)).to.be.rejectedWith('Transaction is not allowed by account-script');
  });

  it('successfully cancel shutdown', async () => {
    const tx = data({
      data: [
        { key: '%s__shutdown' },
      ],
      additionalFee: 4e5,
      chainId,
    }, accounts.factory.seed);

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin1.seed,
      address: accounts.factory.address,
      txId: tx.id,
    });

    await expect(broadcastAndWait(tx)).to.be.fulfilled;
  });

  it('transferWaves in factory should work if no shutdown', async () => {
    const tx = invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'transferWaves',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.calculator.address))}` },
          { type: 'integer', value: 1 },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.calculator.seed);

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin1.seed,
      address: accounts.calculator.address,
      txId: tx.id,
    });

    await expect(broadcastAndWait(tx)).to.be.fulfilled;
  });
});
