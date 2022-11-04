import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const api = create(apiBase);
const chainId = 'R';

describe('otc_multiasset: registerAsset.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully registerAsset', async function () {
    const registerAssetTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'registerAsset',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
          { type: 'integer', value: this.withdrawDelay },
          { type: 'integer', value: this.depositFee },
          { type: 'integer', value: this.withdrawFee },
          { type: 'integer', value: this.minAmountDeposit },
          { type: 'integer', value: this.minAmountWithdraw },
          { type: 'integer', value: this.pairStatus },
        ],
      },
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(registerAssetTx, {});
    const { stateChanges } = await ni.waitForTx(registerAssetTx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 6, 0, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s__withdrawDelay__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: this.withdrawDelay,
    }, {
      key: `%s%s%s__depositFeePermille__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: this.depositFee,
    }, {
      key: `%s%s%s__withdrawFeePermille__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: this.withdrawFee,
    }, {
      key: `%s%s%s__minAmountDeposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: this.minAmountDeposit,
    }, {
      key: `%s%s%s__minAmountWithdraw__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: this.minAmountWithdraw,
    }, {
      key: `%s%s%s__assetsPairStatus__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: this.pairStatus,
    }]);
  });
});
