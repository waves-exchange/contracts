import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { data, invokeScript, setScript } from '@waves/waves-transactions';
import {
  base58Decode, base58Encode, base64Encode,
} from '@waves/ts-lib-crypto';
import {
  chainId, broadcastAndWait, api,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import { compileScript } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] grid_trading: add account`, () => {
  let accounts;
  let assetId1;
  let assetId2;
  let accountId;
  let validScript;
  let rewardAmount;

  before(async () => {
    ({
      accounts, assetId1, assetId2, rewardAmount,
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
  });

  it('no script', async () => {
    const { publicKey } = accounts.creator;

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'addAccount' },
          {
            type: 'list',
            value: [
              { type: 'string', value: publicKey },
            ],
          },
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

    const { publicKey } = accounts.creator;

    return expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'addAccount' },
          {
            type: 'list',
            value: [
              { type: 'string', value: publicKey },
            ],
          },
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

    const accountState = await api.addresses.data(accounts.account1.address);
    expect(accountState).to.deep.equal([
      {
        key: '%s__factoryPublicKey',
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.factory.publicKey))}`,
      },
    ]);

    const factoryState = await api.addresses.data(accounts.factory.address);
    expect(factoryState).to.deep.include.members([
      {
        key: '%s__accountsQueue',
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.account1.publicKey))}`,
      },
      {
        key: `%s%s__${accounts.account1.address}__creatorPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.creator.publicKey))}`,
      },
    ]);
  });

  it('create request after account adding', async () => {
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

    const accountStatusReady = 1;

    const factoryState = await api.addresses.data(accounts.factory.address);

    const expected = [
      {
        key: `%s%s__${accountId}__requestIdToAccountPublicKey`,
        type: 'binary',
        value: `base64:${base64Encode(base58Decode(accounts.account1.publicKey))}`,
      },
      {
        key: `%s%s__${accounts.account1.address}__accountAddressToRequestId`,
        type: 'string',
        value: accountId,
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
      {
        key: '%s__accountsQueue',
        type: 'binary',
        value: 'base64:',
      },
      {
        key: `%s%s__${accountId}__status`,
        type: 'integer',
        value: accountStatusReady,
      },
    ];

    expect(factoryState).to.containSubset(expected);
  });
});
