import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data, invokeScript, setScript } from '@waves/waves-transactions';
import {
  base58Decode, base58Encode, base64Encode, sha256,
} from '@waves/ts-lib-crypto';
import {
  chainId, broadcastAndWait, api,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import { compileScript } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] grid_trading: account init`, () => {
  let accounts;
  let rewardAmount;
  let assetId1;
  let assetId2;
  let accountId;
  let validScript;

  before(async () => {
    ({
      accounts, rewardAmount, assetId1, assetId2,
    } = await setup());

    accountId = base58Encode(sha256([
      ...base58Decode(accounts.user1.address),
      ...base58Decode(assetId1),
      ...base58Decode(assetId2),
    ]));

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
    }, accounts.factory.seed)).catch(({ message }) => { throw new Error(message); });

    await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'request',
        args: [
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetId1))}` },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(assetId2))}` },
        ],
      },
      payment: [
        { assetId: null, amount: rewardAmount },
      ],
      chainId,
    }, accounts.user1.seed)).catch(({ message }) => { throw new Error(message); });
  });

  it('account is not found', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'complete',
        args: [
          { type: 'string', value: base58Encode([1, 2, 3]) },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}` },
        ],
      },
      payment: [],
      chainId,
    }, accounts.account1.seed))).to.be.rejectedWith('account is not found');
  });

  it('no script', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'complete',
        args: [
          { type: 'string', value: accountId },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}` },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.account1.seed))).to.be.rejectedWith('invalid script');
  });

  it('invalid script', async () => {
    const script = `{-# STDLIB_VERSION 7 #-}
    {-# CONTENT_TYPE DAPP #-}
    {-# SCRIPT_TYPE ACCOUNT #-}
    `;

    await broadcastAndWait(setScript({
      script: `base64:${compileScript(script).base64}`,
      chainId,
    }, accounts.account1.seed));

    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'complete',
        args: [
          { type: 'string', value: accountId },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}` },
        ],
      },
      payment: [],
      additionalFee: 4e5,
      chainId,
    }, accounts.account1.seed))).to.be.rejectedWith('invalid script');
  });

  it('successfull init account', async () => {
    await broadcastAndWait(setScript({
      script: validScript,
      chainId,
    }, accounts.account1.seed)).catch(({ message }) => { throw new Error(message); });

    const creatorBalanceBefore = await api.addresses.fetchBalance(
      accounts.creator.address,
    ).then(({ balance }) => balance);

    await broadcastAndWait(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'init',
        args: [
          { type: 'string', value: accountId },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.factory.publicKey))}` },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}` },
        ],
      },
      payment: [],
      chainId,
      additionalFee: 4e5,
    }, accounts.account1.seed)).catch(({ message }) => { throw new Error(message); });

    const accountState = await api.addresses.data(accounts.account1.address);
    expect(accountState).to.deep.equal([
      {
        key: '%s__factoryPublicKey',
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.factory.publicKey))}`,
      },
    ]);

    const creatorBalanceAfter = await api.addresses.fetchBalance(
      accounts.creator.address,
    ).then(({ balance }) => balance);
    expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(rewardAmount);

    const accountStatusReady = 1;
    const factoryState = await api.addresses.data(accounts.factory.address);
    expect(factoryState).to.deep.include.members([
      {
        key: `%s%s__${accountId}__status`,
        type: 'integer',
        value: accountStatusReady,
      },
      {
        key: `%s%s__${accountId}__creatorPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}`,
      },
      {
        key: `%s%s__${accountId}__accountIdToAccountPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.account1.publicKey))}`,
      },
      {
        key: `%s%s__${accounts.account1.address}__accountAddressToAccountId`,
        type: 'string',
        value: accountId,
      },
    ]);
  });

  it('account exists', async () => {
    await broadcastAndWait(setScript({
      script: validScript,
      chainId,
    }, accounts.account2.seed)).catch(({ message }) => { throw new Error(message); });

    expect(broadcastAndWait(invokeScript({
      dApp: accounts.account2.address,
      call: {
        function: 'init',
        args: [
          { type: 'string', value: accountId },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.factory.publicKey))}` },
          { type: 'binary', value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}` },
        ],
      },
      payment: [],
      chainId,
      additionalFee: 4e5,
    }, accounts.account2.seed))).to.be.rejectedWith('account is already exists');
  });
});
