import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { lpStable } from './contract/lp_stable.mjs';
import { chainId } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('lp_stable: put_one_tkn_get_one_tkn.mjs put one token, get one token', /** @this {MochaSuiteModified} */() => {
  before(async function () {
    await lpStable.setFee({
      senderPublicKey: publicKey(this.accounts.lpStable),
      caller: this.accounts.manager,
      value: 0,
    });
  });
  it('user should receive the same amount after get minus fees', async function () {
    const dApp = address(this.accounts.lpStable, chainId);
    const caller = this.accounts.user1;
    const amountAssetId = this.usdtAssetId;
    const priceAssetId = this.usdnAssetId;

    // initial put
    await lpStable.put({
      dApp,
      caller,
      amountAssetId,
      priceAssetId,
      amountAssetAmount: 10e2,
      priceAssetAmount: 10e6,
    });

    const priceAssetAmount = 5e6;
    const inFee = 100000;
    const outFee = 100000;
    let expectedReceivedAmount = priceAssetAmount - (priceAssetAmount * (inFee / 10 ** 8));
    expectedReceivedAmount -= (expectedReceivedAmount * (outFee / 10 ** 8));
    const putOneTknInfo = await lpStable.putOneTknV2({
      dApp,
      caller,
      assetId: priceAssetId,
      amount: priceAssetAmount,
    });

    let lpAssetAmount;
    {
      const transfersToUser = putOneTknInfo.stateChanges.transfers
        .filter((t) => t.address === address(caller, chainId));

      expect(transfersToUser.length).to.equal(1, '1 transfer to caller is expected');
      expect(transfersToUser[0].asset).to.equal(this.lpStableAssetId, 'lpAssetId is expected');

      // DLp error if all LP tokens is sent
      // `Error while executing dApp: lp_stable.ride: updated DLp lower than current DLp`
      lpAssetAmount = transfersToUser[0].amount - 4;
    }

    const getOneTknInfo = await lpStable.getOneTknV2({
      dApp,
      caller,
      outAssetId: priceAssetId,
      lpAssetId: this.lpStableAssetId,
      lpAssetAmount,
    });

    let outAssetAmount;
    {
      const transfersToUser = getOneTknInfo.stateChanges.transfers
        .filter((t) => t.address === address(caller, chainId));

      expect(transfersToUser.length).to.equal(1, '1 transfer to caller is expected');
      expect(transfersToUser[0].asset).to.equal(priceAssetId, 'price asset is expected');

      outAssetAmount = transfersToUser[0].amount;
    }

    const allowableError = 2;
    expect(outAssetAmount).to.be
      .within(expectedReceivedAmount - allowableError, expectedReceivedAmount);
  });
});
