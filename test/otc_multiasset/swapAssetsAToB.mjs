import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const api = create(apiBase);
const chainId = 'R';

describe('otc_multiasset: swapAssetsAToB.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully swapAssetsAToB', async function () {
    const amountAssetA = this.minAmountDeposit + 1;

    const expectedBalance = 4985001;
    const expectedTotalCommissionsCollectedDeposit = 15000;
    const expectedAmountAssetB = amountAssetA;

    const swapAssetsAToBTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [{
        assetId: this.assetAId,
        amount: amountAssetA,
      }],
      call: {
        function: 'swapAssetsAToB',
        args: [
          { type: 'string', value: this.assetBId },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(swapAssetsAToBTx, {});
    const { stateChanges } = await ni.waitForTx(swapAssetsAToBTx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 2, 1, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s%s__balance__${this.assetAId}__${this.assetBId}__${address(this.accounts.user1, chainId)}`,
      type: 'integer',
      value: expectedBalance,
    }, {
      key: `%s%s%s%s__totalFeeCollected__deposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: expectedTotalCommissionsCollectedDeposit,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.assetBId,
      amount: expectedAmountAssetB,
    }]);
  });
});
