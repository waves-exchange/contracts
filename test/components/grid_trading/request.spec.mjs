import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import { base64Encode } from '@waves/ts-lib-crypto';
import { chainId, broadcastAndWait } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] grid_trading: request`, () => {
  let accounts;
  let rewardAmount;
  let assetId1;
  let assetId2;

  before(async () => {
    ({
      accounts, rewardAmount, assetId1, assetId2,
    } = await setup());
  });

  it('pair is not allowed', async () => {
    expect(broadcastAndWait(invokeScript({
      dApp: accounts.factory.address,
      call: {
        function: 'request',
        args: [
          { type: 'binary', value: base64Encode(base58Decode(assetId1)) },
          { type: 'binary', value: base64Encode(base58Decode(assetId2)) },
        ],
      },
      payment: [
        { assetId: null, amount: rewardAmount },
      ],
      chainId,
    }, accounts.factory.seed))).to.be.rejectedWith('pair is not allowed');
  });
});
