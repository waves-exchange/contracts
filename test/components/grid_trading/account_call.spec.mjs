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

describe(`[${process.pid}] grid_trading: account call`, () => {
  let accounts;
  let rewardAmount;
  let assetId1;
  let assetId2;
  let accountId;

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

    accountId = base58Encode(sha256([
      ...base58Decode(accounts.user1.address),
      ...base58Decode(assetId1),
      ...base58Decode(assetId2),
    ]));

    const kAccountScript = '%s__accountScript';
    const script = await api.addresses.fetchDataKey(
      accounts.factory.address,
      kAccountScript,
    ).then(({ value }) => value);

    await broadcastAndWait(setScript({
      script,
      chainId,
    }, accounts.account1.seed)).catch(({ message }) => { throw new Error(message); });

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
  });

  it('permission denied', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'setIntParam' },
          {
            type: 'list',
            value: [
              { type: 'string', value: 'test' },
              { type: 'string', value: '1' },
            ],
          },
        ],
      },
      payment: [],
      chainId,
    }, accounts.user2.seed))).to.be.rejectedWith('permission denied');
  });

  it('successfully set int param', async () => {
    const targetFunction = 'setIntParam';
    const entryKey = 'test';
    const entryValue = 1;
    const { stateChanges } = await broadcastAndWait(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: targetFunction },
          {
            type: 'list',
            value: [
              { type: 'string', value: entryKey },
              { type: 'string', value: entryValue.toString() },
            ],
          },
        ],
      },
      payment: [],
      chainId,
    }, accounts.user1.seed)).catch(({ message }) => { throw new Error(message); });

    expect(stateChanges.invokes[0].dApp).to.equal(accounts.service.address);
    expect(stateChanges.invokes[0].call.function).to.equal(targetFunction);

    const accountState = await api.addresses.data(accounts.account1.address);
    expect(accountState).to.deep.include.members([
      {
        key: entryKey,
        type: 'integer',
        value: entryValue,
      },
    ]);
  });

  it('change service address', async () => {
    const errorMessage = 'forbidden';
    const script = `{-# STDLIB_VERSION 7 #-}
    {-# CONTENT_TYPE DAPP #-}
    {-# SCRIPT_TYPE ACCOUNT #-}
    
    @Callable(i)
    func setIntParam(args: List[String]) = throw("${errorMessage}")
    `;

    await broadcastAndWait(setScript({
      script: `base64:${compileScript(script).base64}`,
      chainId,
    }, accounts.serviceNew.seed));

    const kServicePublicKey = '%s__servicePublicKey';
    await broadcastAndWait(data({
      data: [
        { key: kServicePublicKey, type: 'binary', value: base64Encode(base58Decode(accounts.serviceNew.publicKey)) },
      ],
      chainId,
    }, accounts.factory.seed));

    expect(broadcastAndWait(invokeScript({
      dApp: accounts.account1.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'setIntParam' },
          {
            type: 'list',
            value: [
              { type: 'string', value: 'test' },
              { type: 'string', value: '1' },
            ],
          },
        ],
      },
      payment: [],
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith(errorMessage);
  });
});
