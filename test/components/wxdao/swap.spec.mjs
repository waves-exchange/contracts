import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, transfer } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait, baseSeed, waitForHeight,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] wxdao: swap`, () => {
  let accounts;
  let wxdaoAssetId;
  let pwrAssetId;
  let wxAssetId;
  let lockFrom;
  let lockDuration;

  before(async () => {
    ({
      accounts, wxdaoAssetId, pwrAssetId, wxAssetId, lockDuration,
    } = await setup());

    await broadcastAndWait(transfer({
      recipient: accounts.user1.address,
      assetId: wxdaoAssetId,
      amount: 1000e8,
      additionalFee: 4e5,
    }, accounts.factory.seed));

    await broadcastAndWait(transfer({
      recipient: accounts.factory.address,
      assetId: pwrAssetId,
      amount: 1e8,
      additionalFee: 4e5,
    }, baseSeed));

    await broadcastAndWait(transfer({
      recipient: accounts.factory.address,
      assetId: wxAssetId,
      amount: 1000e8,
      additionalFee: 4e5,
    }, baseSeed));
  });

  it('successfully swap', async () => {
    const amount = 1e8;
    const { stateChanges, height } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'swap' },
          { type: 'list', value: [] },
        ],
      },
      payment: [
        {
          assetId: wxdaoAssetId,
          amount,
        },
      ],
      chainId,
    }, accounts.user1.seed)).catch(({ message }) => { throw new Error(message); });
    lockFrom = height;

    expect(stateChanges.invokes[0].stateChanges.burns[0]).to.deep.equal({
      assetId: wxdaoAssetId,
      quantity: amount,
    });
  });

  it('successfully unlock', async () => {
    await waitForHeight(lockFrom + lockDuration + 1);
    const index = 0;
    const { stateChanges } = await broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'unlock' },
          {
            type: 'list',
            value: [
              { type: 'string', value: index.toString() },
            ],
          },
        ],
      },
      payment: [],
      chainId,
    }, accounts.user1.seed)).catch(({ message }) => { throw new Error(message); });

    // factory wx balance * payment amount / wx dao emission
    const expectedAmount = 100000;
    expect(
      stateChanges.invokes[0].stateChanges.invokes[0].stateChanges.transfers[0],
    ).to.deep.equal({
      address: accounts.user1.address,
      asset: wxAssetId,
      amount: expectedAmount,
    });
    expect(
      stateChanges.invokes[0].stateChanges.invokes[1].stateChanges.data[0],
    ).to.deep.equal({
      key: `%s%s%d__lock__${accounts.user1.address}__0`,
      value: null,
    });
  });

  it('invalid lock', async () => {
    const index = 1;
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'call',
        args: [
          { type: 'string', value: 'unlock' },
          {
            type: 'list',
            value: [
              { type: 'string', value: index.toString() },
            ],
          },
        ],
      },
      payment: [],
      chainId,
    }, accounts.user1.seed))).to.be.rejectedWith('invalid lock');
  });
});
