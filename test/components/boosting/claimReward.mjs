import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  transfer,
} from '@waves/waves-transactions';

import {
  broadcastAndWait, chainId, waitNBlocks, api,
} from '../../utils/api.mjs';
import { boosting, parseLockParams, keyLock } from './contract/boosting.mjs';
import { gwx } from './contract/gwx.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('boosting: claimReward.mjs', /** @this {MochaSuiteModified} */() => {
  const lockDuration = 3;
  const lockWxAmount = 1e3 * 1e8;
  let lockTxId;

  before(async function () {
    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: lockWxAmount,
      assetId: this.wxAssetId,
      additionalFee: 4e5,
    }, this.accounts.emission.seed));

    let stateChanges;
    ({ id: lockTxId, height: lockHeight, stateChanges } = await boosting.lock({
      caller: this.accounts.user0.seed,
      duration: lockDuration,
      payments: [
        { assetId: this.wxAssetId, amount: lockWxAmount },
      ],
      chainId,
    }));

    const boostingDataChanges = Object.fromEntries(
      stateChanges.data.map(({ key, value }) => [key, value]),
    );

    const lockKey = keyLock(this.accounts.user0.addr, lockTxId);
    lockParamsPrev = parseLockParams(
      boostingDataChanges[lockKey],
    );
  });

  it('should successfully claim reward', async function () {
    await waitNBlocks(1);
    const { stateChanges } = await gwx.claimReward({
      dApp: this.accounts.gwx.addr,
      caller: this.accounts.user0.seed,
    });
    // TODO: check stateChanges
  });
});
