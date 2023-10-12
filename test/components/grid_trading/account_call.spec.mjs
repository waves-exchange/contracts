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
});
