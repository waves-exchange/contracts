import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
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
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'requestAccount',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: assetId2 },
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
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'requestAccount',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: assetId2 },
        ],
      },
      payment: [
        { assetId: assetId1, amount: rewardAmount },
      ],
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('invalid asset');
  });

  it('invalid amount', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'requestAccount',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: assetId2 },
        ],
      },
      payment: [
        { assetId: null, amount: rewardAmount - 1 },
      ],
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('pair is not allowed');
  });

  it('pair is not allowed', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'requestAccount',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: assetId2 },
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

    const { stateChanges } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'requestAccount',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: assetId2 },
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

    expect(stateChanges.data).to.deep.equal(expected);
  });

  it('account already exists', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'requestAccount',
        args: [
          { type: 'string', value: assetId1 },
          { type: 'string', value: assetId2 },
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

    const { stateChanges } = await broadcastAndWait(invokeScript({
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
    expect(stateChanges.invokes[0].stateChanges.data).to.deep.equal([
      {
        key: '%s__requestsQueue',
        type: 'binary',
        value: 'base64:',
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
        key: `%s%s__${accounts.account1.address}__accountAddressToRequestId`,
        type: 'string',
        value: requestId,
      },
      {
        key: `%s%s__${accounts.account1.address}__creatorPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}`,
      },
    ]);
    expect(stateChanges.invokes[0].stateChanges.transfers).to.deep.equal([
      {
        address: accounts.creator.address,
        asset: null,
        amount: rewardAmount,
      },
    ]);
  });
});
