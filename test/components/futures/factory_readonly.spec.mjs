import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import {
  invokeScript, data, setScript,
} from '@waves/waves-transactions';
import {
  base58Decode, base58Encode, sha256,
} from '@waves/ts-lib-crypto';
import {
  chainId, broadcastAndWait, api,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] futures: factory readonly`, () => {
  let accounts;
  let assetId1;
  let assetId2;
  let requestId;
  let validScript;
  let rewardAmount;
  const leverage = 2;

  before(async () => {
    ({
      accounts, assetId1, assetId2, rewardAmount,
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

    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__${assetId1}__${assetId2}__pairAllowed`, type: 'boolean', value: true },
        { key: '%s__usdtAssetId', type: 'string', value: assetId2 },
      ],
      chainId,
    }, accounts.factory.seed)).catch(({ message }) => { throw new Error(message); });

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
              { type: 'string', value: `${leverage}` },
            ],
          },
        ],
      },
      payment: [
        { assetId: null, amount: rewardAmount },
      ],
      chainId,
    }, accounts.user1.seed)).catch(({ message }) => { throw new Error(message); });
  });

  it('getAccountInfoREADONLY', async () => {
    const functionName = 'getAccountInfoREADONLY';

    const expr = `call(\"${functionName}\", [\"${accounts.account1.address}\"])`; /* eslint-disable-line */
    console.log(expr);
    const response = await api.utils.fetchEvaluate(
      accounts.factory.address,
      expr,
    );
    const checkData = response.result.value._2; /* eslint-disable-line */

    return expect(checkData).to.eql({
      type: 'Tuple',
      value: {
        _1: {
          type: 'String',
          value: assetId1,
        },
        _2: {
          type: 'String',
          value: assetId2,
        },
        _3: {
          type: 'String',
          value: accounts.account1.address,
        },
        _4: {
          type: 'String',
          value: accounts.account1.publicKey,
        },
        _5: {
          type: 'Int',
          value: leverage,
        },
        _6: {
          type: 'String',
          value: requestId,
        },
        _7: {
          type: 'BigInt',
          value: 0,
        },
        _8: {
          type: 'BigInt',
          value: 0,
        },
        _9: {
          type: 'BigInt',
          value: 0,
        },
        _10: {
          type: 'BigInt',
          value: 0,
        },
        _11: {
          type: 'BigInt',
          value: 0,
        },
      },
    });
  });
});
