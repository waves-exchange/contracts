import { data, transfer, reissue } from '@waves/waves-transactions';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  api,
  broadcastAndWait,
  waitForHeight,
  waitNBlocks,
} from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';
import { staking } from './contract/staking.mjs';
import { calcGwxAmountAtHeight, calcGwxAmountStart } from './math/gwx.mjs';
import { calcReward } from './math/staking.mjs';

const { CHAIN_ID: chainId } = process.env;

chai.use(chaiAsPromised);

const separator = '__';

describe(`${process.pid}: increaseWxEmissionPerBlock`, () => {
  const lpAssetAmount = 1e3 * 1e8;
  const wxAmount = 1e3 * 1e8;
  let lockStartHeight;
  before(async function () {
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: wxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    ({ height: lockStartHeight } = await boosting.lock({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.user0.seed,
      duration: this.maxLockDuration,
      payments: [{ assetId: this.wxAssetId, amount: wxAmount }],
    }));
    // await waitForHeight(lockStartHeight + 1);

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

    // total cached gwx = sum of gwx start quantities
    // there's only one user
    const totalCachedGwx = calcGwxAmountStart({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
    });

    const totalCachedGwxEval = (await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      'getTotalCachedGwxREADONLY()',
    )).result.value._2.value;

    expect(BigInt(totalCachedGwxEval)).to.equal(totalCachedGwx);

    console.log('claimWx');
    let txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });
    console.log('claimWx success');

    let userGwx = calcGwxAmountAtHeight({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
      lockStartHeight,
      height: txInfo.height,
    });

    const userGwxEval = (await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      `getUserGwxAmountAtHeightREADONLY("${this.accounts.user0.addr}", ${txInfo.height})`,
    )).result.value._2.value;

    expect(BigInt(userGwxEval)).to.equal(userGwx);

    // boost = 0 if called in next block?
    await waitForHeight(txInfo.height + 2);
    txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });

    userGwx = calcGwxAmountAtHeight({
      amount: wxAmount,
      lockDuration: this.maxLockDuration,
      maxLockDuration: this.maxLockDuration,
      lockStartHeight,
      height: txInfo.height,
    });
;
  });
  it('should successfully claim', async function () {
    const currentRatePerBlock = await api.addresses.fetchDataKey(
      this.accounts.emission.addr,
      ['%s%s', 'ratePerBlock', 'current'].join(separator),
    );

    // let readonly = (await api.utils.fetchEvaluate(
    //   this.accounts.boosting.addr,
    //   `claimWxBoostREADONLY("${this.lpAssetId}", ${this.accounts.user0.addr})`,
    // )).result.value._2.value;

    let claimWxBoostREADONLY = (await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      `claimWxBoostREADONLY("${this.lpAssetId}", "${this.accounts.user0.addr}")`,
    )).result.value._2.value;

    console.log(claimWxBoostREADONLY);
    // const currentHeight = await api.blocks.fetchHeight();
    // await waitForHeight(currentHeight + 1);
    await waitNBlocks(5);

    let txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });
    let txHeight = txInfo.height;

    claimWxBoostREADONLY = (await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      `claimWxBoostREADONLY("${this.lpAssetId}", "${this.accounts.user0.addr}")`,
    )).result.value._2.value;

    console.log(claimWxBoostREADONLY);

    const newRatePerBlock = currentRatePerBlock.value / 2;

    const emissionRatePerBlockKey = ['%s%s', 'ratePerBlock', 'current'].join(separator);
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

    txHeight = txInfo.height;

    claimWxBoostREADONLY = (await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      `claimWxBoostREADONLY("${this.lpAssetId}", "${this.accounts.user0.addr}")`,
    // )).result.value._2.value;
    ));

    console.log(claimWxBoostREADONLY);

    await waitForHeight(txHeight + 1);

    txInfo = await staking.claimWx({
      dApp: this.accounts.staking.addr,
      caller: this.accounts.user0.seed,
      lpAssetId: this.lpAssetId,
    });
    txHeight = txInfo.height;
  });
});
