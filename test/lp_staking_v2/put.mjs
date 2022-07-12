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

describe('lp_staking_v2: put.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully put', async function () {
    const amount = 10000;
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
    const { height, stateChanges, id } = await ni.waitForTx(put.id, { apiBase });

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
      key: `%s%d%s%s__P__${internalBasetAssetStr.value}__${address(this.accounts.user, chainId)}__${id}`,
      type: 'string',
      value: `%s%d%d%d%d%d%d%d__FINISHED__${amount}__${price.value}__${amount}__${height}__${timestamp}__${height}__${timestamp}`,
    }, {
      key: `%s%s__balance__${this.usdnAssetId}`,
      type: 'integer',
      value: amount,
    }]);

    const shareAssetId = await api.addresses.fetchDataKey(
      lpStakingV2,
      `%s%s%s__mappings__baseAsset2shareId__${this.usdnAssetId}`,
    );

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.user, chainId),
      asset: shareAssetId.value,
      amount,
    }, {
      address: address(this.accounts.proxy, chainId),
      asset: this.usdnAssetId,
      amount,
    }]);

    expect(stateChanges.reissues).to.eql([{
      assetId: shareAssetId.value,
      isReissuable: true,
      quantity: amount,
    }]);
  });
});
