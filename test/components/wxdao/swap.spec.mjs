import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript, transfer } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait, baseSeed,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] wxdao: swap`, () => {
  let accounts;
  let wxdaoAssetId;
  let pwrAssetId;

  before(async () => {
    ({
      accounts, wxdaoAssetId, pwrAssetId,
    } = await setup());

    await broadcastAndWait(transfer({
      recipient: accounts.user1.address,
      assetId: wxdaoAssetId,
      amount: 1e8,
      additionalFee: 4e5,
      chainId,
    }, accounts.factory.seed));

    await broadcastAndWait(transfer({
      recipient: accounts.factory.address,
      assetId: pwrAssetId,
      amount: 1e8,
      additionalFee: 4e5,
      chainId,
    }, baseSeed));
  });

  it('successfully swap', async () => {
    const amount = 1000;
    const { stateChanges } = await broadcastAndWait(invokeScript({
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

    expect(stateChanges.invokes[0].stateChanges.burns[0]).to.deep.equal({
      assetId: wxdaoAssetId,
      quantity: amount,
    });

    expect(
      stateChanges.invokes[0]
        .stateChanges.invokes[0]
        .stateChanges.invokes[0]
        .dApp,
    ).to.equal(accounts.power.address);
  });
});
