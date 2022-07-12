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

describe('lp_staking_v2: submitGetRequest.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully submitGetRequest', async function () {
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
    await ni.waitForTx(put.id, { apiBase });

    const shareAssetId = await api.addresses.fetchDataKey(
      lpStakingV2,
      `%s%s%s__mappings__baseAsset2shareId__${this.usdnAssetId}`,
    );

    const submitGetRequest = invokeScript({
      dApp: lpStakingV2,
      payment: [{
        assetId: shareAssetId.value,
        amount,
      }],
      call: {
        function: 'submitGetRequest',
        args: [],
      },
      chainId,
    }, this.accounts.user);
    await api.transactions.broadcast(submitGetRequest, {});
    const { height, stateChanges, id } = await ni.waitForTx(submitGetRequest.id, { apiBase });

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
      key: `%s%d%s%s__G__${internalBasetAssetStr.value}__${address(this.accounts.user, chainId)}__${id}`,
      type: 'string',
      value: `%s%d%d%d%d%d%d%d__PENDING__${amount}__${price.value}__${amount}__${height}__${timestamp}__${height + 3}__0`,
    }, {
      key: `%s%s%d__total__locked__${internalBasetAssetStr.value}`,
      type: 'string',
      value: `%d%d__${amount}__${amount}`,
    }, {
      key: `%s%s%d%s__total__locked__${internalBasetAssetStr.value}__${address(this.accounts.user, chainId)}`,
      type: 'string',
      value: `%d%d__${amount}__${amount}`,
    }, {
      key: `%s%s__balance__${this.usdnAssetId}`,
      type: 'integer',
      value: 0,
    }]);

    expect(stateChanges.burns).to.eql([{
      assetId: shareAssetId.value,
      quantity: amount,
    }]);
  });
});
