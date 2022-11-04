import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_staking_v2: topUpBalance.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully topUpBalance', async function () {
    const amount = 10000;
    const delta = 10;
    const lpStakingV2 = address(this.accounts.lpStakingV2, chainId);

    const put = invokeScript({
      dApp: lpStakingV2,
      payment: [{
        assetId: this.usdnAssetId,
        amount,
      }],
      call: {
        function: 'put',
        args: [],
      },
      chainId,
    }, this.accounts.user);
    await api.transactions.broadcast(put, {});
    await ni.waitForTx(put.id, { apiBase });

    const beforeBalance = await api.assets.fetchBalanceAddressAssetId(
      lpStakingV2,
      this.usdnAssetId,
    );

    const topUpBalance = invokeScript({
      dApp: lpStakingV2,
      payment: [{
        assetId: this.usdnAssetId,
        amount,
      }],
      call: {
        function: 'topUpBalance',
        args: [
          { type: 'string', value: this.usdnAssetId },
          { type: 'integer', value: delta },
        ],
      },
      chainId,
    }, this.accounts.proxy);
    await api.transactions.broadcast(topUpBalance, {});
    const { height, stateChanges } = await ni.waitForTx(topUpBalance.id, { apiBase });

    const afterBalance = await api.assets.fetchBalanceAddressAssetId(
      lpStakingV2,
      this.usdnAssetId,
    );

    expect(beforeBalance.balance.toString()).to.eql(
      (afterBalance.balance - amount).toString(),
    );

    const internalBasetAssetStr = await api.addresses.fetchDataKey(
      lpStakingV2,
      `%s%s%s__mappings__baseAsset2internalId__${this.usdnAssetId}`,
    );
    const price = await api.addresses.fetchDataKey(
      lpStakingV2,
      `%s%s%d__price__last__${internalBasetAssetStr.value}`,
    );
    const { timestamp } = await api.blocks.fetchHeadersAt(height);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%d__price__last__${internalBasetAssetStr.value}`,
      type: 'integer',
      value: price.value,
    }, {
      key: `%s%s%d%d%d__price__history__${internalBasetAssetStr.value}__${height}__${timestamp}`,
      type: 'integer',
      value: price.value,
    }, {
      key: `%s%s%s%d%s__topup__last__height__${internalBasetAssetStr.value}__${address(this.accounts.proxy, chainId)}`,
      type: 'integer',
      value: height,
    }, {
      key: `%s%s__balance__${this.usdnAssetId}`,
      type: 'integer',
      value: amount + delta,
    }]);
  });
});
