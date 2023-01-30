import { data, transfer } from '@waves/waves-transactions';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { broadcastAndWait, waitNBlocks } from '../../utils/api.mjs';
import { staking } from './contract/staking.mjs';

const { CHAIN_ID: chainId } = process.env;

chai.use(chaiAsPromised);

const separator = '__';

describe(`${process.pid}: claim wx`, () => {
  before(async function () {
    await broadcastAndWait(data({
      data: [
        {
          key: ['%s%s%s', this.lpAssetId, 'mappings', 'lpAsset2PoolContract'].join(separator),
          type: 'string',
          value: this.accounts.lp.addr,
        },
        {
          key: ['%s%s', 'poolWeight', this.accounts.lp.addr].join(separator),
          type: 'integer',
          value: 1e8,
        },
      ],
      chainId,
    }, this.accounts.factory.seed));

    const lpAssetAmount = 1e3 * 1e8;
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: lpAssetAmount,
      assetId: this.lpAssetId,
    }, this.accounts.factory.seed));

    await staking.stake({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      payments: [{ assetId: this.lpAssetId, amount: lpAssetAmount }],
    });
    await waitNBlocks(1);
  });
  it('should successfully claim', async function () {
    const txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });
    expect(txInfo.applicationStatus).to.equal('succeeded');
  });
});