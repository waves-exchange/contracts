import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import {
  data, invokeScript, setScript, transfer,
} from '@waves/waves-transactions';
import {
  base58Decode, base64Encode, base58Encode, sha256,
} from '@waves/ts-lib-crypto';
import {
  chainId, broadcastAndWait, baseSeed, api,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] grid_trading: factory request account`, () => {
  let accounts;
  let rewardAmount;
  let assetId1;
  let assetId2;
  let validScript;
  let requestId;

  before(async () => {
    ({
      accounts, rewardAmount, assetId1, assetId2,
    } = await setup());

    requestId = base58Encode(sha256([
      ...base58Decode(accounts.user1.address),
      ...base58Decode(assetId1),
      ...base58Decode(assetId2),
    ]));

    const kAccountScript = '%s__accountScript';
    validScript = await api.addresses.fetchDataKey(
      accounts.factory.address,
      kAccountScript,
    ).then(({ value }) => value);
  });

  it('1 payment is required', async () => {
    const functionName = 'requestAccount';

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: functionName },
          {
            type: 'list',
            value: [
              { type: 'string', value: assetId1 },
              { type: 'string', value: assetId2 },
            ],
          },
        ],
      },
      payment: [],
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('1 payment is required');
  });

  it('invalid asset', async () => {
    await broadcastAndWait(transfer({
      recipient: accounts.user1.address,
      assetId: assetId1,
      amount: 1e8,
    }, baseSeed));

    const functionName = 'requestAccount';

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: functionName },
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
        { assetId: assetId1, amount: rewardAmount },
      ],
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('invalid asset');
  });

  it('invalid amount', async () => {
    const functionName = 'requestAccount';

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: functionName },
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
        { assetId: null, amount: rewardAmount - 1 },
      ],
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('invalid amount');
  });

  it('pair is not allowed', async () => {
    const functionName = 'requestAccount';

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: functionName },
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
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('pair is not allowed');
  });

  it('successfully create request', async () => {
    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__${assetId1}__${assetId2}__pairAllowed`, type: 'boolean', value: true },
      ],
      chainId,
    }, accounts.factory.seed)).catch(({ message }) => { throw new Error(message); });

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
            ],
          },
        ],
      },
      payment: [
        { assetId: null, amount: rewardAmount },
      ],
      chainId,
    }, accounts.user1.seed)).catch(({ message }) => { throw new Error(message); });

    const accountId = base58Encode(sha256([
      ...base58Decode(accounts.user1.address),
      ...base58Decode(assetId1),
      ...base58Decode(assetId2),
    ]));

    const accountStatusEmpty = 0;

    const factoryState = await api.addresses.data(accounts.factory.address);

    const expected = [
      {
        key: `%s%s__${accountId}__status`,
        type: 'integer',
        value: accountStatusEmpty,
      },
      {
        key: '%s__requestsQueue',
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accountId))}`,
      },
      {
        key: `%s%s__${accountId}__ownerPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.user1.publicKey))}`,
      },
      {
        key: `%s%s__${accountId}__amountAssetId`,
        type: 'string',
        value: assetId1,
      },
      {
        key: `%s%s__${accountId}__priceAssetId`,
        type: 'string',
        value: assetId2,
      },
    ];

    expect(factoryState).to.containSubset(expected);
  });

  it('account already exists', async () => {
    const functionName = 'requestAccount';

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: functionName },
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
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('account is already exists');
  });

  it('add account after request was created', async () => {
    await broadcastAndWait(setScript({
      script: validScript,
      chainId,
    }, accounts.account1.seed)).catch(({ message }) => { throw new Error(message); });

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
    }, accounts.account1.seed)).catch(({ message }) => { throw new Error(message); });

    const accountStatusReady = 1;

    const factoryState = await api.addresses.data(accounts.factory.address);

    expect(factoryState).to.containSubset([
      {
        key: `%s%s__${accounts.account1.address}__accountAddressToRequestId`,
        type: 'string',
        value: requestId,
      },
      {
        key: `%s%s__${accounts.account1.address}__creatorPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}`,
      },
      {
        key: `%s%s__${requestId}__status`,
        type: 'integer',
        value: accountStatusReady,
      },
      {
        key: `%s%s__${requestId}__requestIdToAccountPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.account1.publicKey))}`,
      },
      {
        key: '%s__requestsQueue',
        type: 'binary',
        value: 'base64:',
      },
    ]);
    // TODO: check factory and creator balances
  });
});
