import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { transfer, reissue } from '@waves/waves-transactions';

import { api, broadcastAndWait, waitForHeight } from '../../utils/api.mjs';
import { boosting } from './contract/boosting.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const chainId = 'R';

describe('boosting: claimWxBoostREADONLY.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully claimWxBoostREADONLY', async function () {
    const lpAssetAmount = 1e3 * 1e8;
    const wxAmount = 1e3 * 1e8;

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

    const { height: lockStartHeight } = await boosting.lock({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.user0.seed,
      duration: this.maxLockDuration,
      payments: [{ assetId: this.wxAssetId, amount: wxAmount }],
    });
    await waitForHeight(lockStartHeight + 1);

    const expr = `claimWxBoostREADONLY(\"${this.lpAssetId}\", \"${this.accounts.user0.addr}\")`; /* eslint-disable-line */
    const response = await api.utils.fetchEvaluate(
      this.accounts.boosting.addr,
      expr,
    );

    const checkData = response.result.value._2.value; /* eslint-disable-line */
    expect(checkData[0]).to.eql({
      type: 'Int',
      value: 0,
    });
  });
});
