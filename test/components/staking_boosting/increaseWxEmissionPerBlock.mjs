import { data, transfer, reissue } from '@waves/waves-transactions';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  api,
  broadcastAndWait,
  waitForHeight,
} from '../../utils/api.mjs';
import { staking } from './contract/staking.mjs';

const { CHAIN_ID: chainId } = process.env;

chai.use(chaiAsPromised);

const separator = '__';

describe(`${process.pid}: increaseWxEmissionPerBlock`, () => {
  const lpAssetAmount = 1e3 * 1e8;
  const wxAmount = 1e3 * 1e8;

  before(async function () {
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: wxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    const lpAssetIssueTx = reissue({
      assetId: this.lpAssetId,
      quantity: lpAssetAmount * 10,
      reissuable: true,
      chainId,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetIssueTx);

    const lpAssetTransferTx = transfer({
      recipient: this.accounts.user0.addr,
      amount: lpAssetAmount,
      assetId: this.lpAssetId,
      additionalFee: 4e5,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetTransferTx);

    const { height } = await staking.stake({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      payments: [{ assetId: this.lpAssetId, amount: lpAssetAmount }],
    });
    await waitForHeight(height + 2);
  });

  it('should successfully claim', async function () {
    const currentRatePerBlock = await api.addresses.fetchDataKey(
      this.accounts.emission.addr,
      ['%s%s', 'ratePerBlock', 'current'].join(separator),
    );

    let txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });

    const newRatePerBlock = currentRatePerBlock.value / 2;
    const emissionRatePerBlockKey = ['%s%s', 'ratePerBlock', 'current'].join(separator);

    await staking.onModifyWeight({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.factory.seed,
      lpAssetIdStr: this.lpAssetId,
      poolAddressStr: this.accounts.lp.addr,
    });

    txInfo = await broadcastAndWait(data({
      data: [
        {
          key: emissionRatePerBlockKey,
          type: 'integer',
          value: newRatePerBlock,
        },
      ],
      chainId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    await waitForHeight(txInfo.height + 1);

    txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });
  });
});
