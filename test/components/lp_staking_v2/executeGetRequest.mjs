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

describe('lp_staking_v2: executeGetRequest.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully executeGetRequest', async function () {
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
    const { height, id } = await ni.waitForTx(submitGetRequest.id, { apiBase });
    const { timestamp: timestampSubmitGetRequest } = await api.blocks.fetchHeadersAt(height);

    await ni.waitForHeight(height + this.getDelay, { apiBase });

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
    await ni.waitForTx(topUpBalance.id, { apiBase });

    const executeGetRequest = invokeScript({
      dApp: lpStakingV2,
      call: {
        function: 'executeGetRequest',
        args: [
          { type: 'string', value: this.usdnAssetId },
          { type: 'string', value: address(this.accounts.user, chainId) },
          { type: 'string', value: id },
        ],
      },
      chainId,
    }, this.accounts.user);
    await api.transactions.broadcast(executeGetRequest, {});
    const {
      height: heightExecuteGetRequest,
      stateChanges: stateChangesExecuteGetRequest,
    } = await ni.waitForTx(
      executeGetRequest.id,
      { apiBase },
    );

    const internalBasetAssetStr = await api.addresses.fetchDataKey(
      lpStakingV2,
      `%s%s%s__mappings__baseAsset2internalId__${this.usdnAssetId}`,
    );
    const price = await api.addresses.fetchDataKey(
      lpStakingV2,
      `%s%s%d__price__last__${internalBasetAssetStr.value}`,
    );
    const {
      timestamp: timestampeExecuteGetRequest,
    } = await api.blocks.fetchHeadersAt(
      heightExecuteGetRequest,
    );

    expect(stateChangesExecuteGetRequest.data).to.eql([{
      key: `%s%d%s%s__G__${internalBasetAssetStr.value}__${address(this.accounts.user, chainId)}__${id}`,
      type: 'string',
      value: `%s%d%d%d%d%d%d%d__FINISHED__${amount}__${price.value}__${amount}__${height}__${timestampSubmitGetRequest}__${height + this.getDelay}__${timestampeExecuteGetRequest}`,
    }, {
      key: `%s%s%d__total__locked__${internalBasetAssetStr.value}`,
      type: 'string',
      value: '%d%d__0__0',
    }, {
      key: `%s%s%d%s__total__locked__${internalBasetAssetStr.value}__${address(this.accounts.user, chainId)}`,
      type: 'string',
      value: '%d%d__0__0',
    }]);

    expect(stateChangesExecuteGetRequest.transfers).to.eql([{
      address: address(this.accounts.user, chainId),
      asset: this.usdnAssetId,
      amount,
    }]);
  });
});
