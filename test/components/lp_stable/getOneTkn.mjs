import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { flattenInvokesList, flattenTransfers } from './contract/tools.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_stable: getOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully getOneTkn.', async function () {
    const outLp = 1e10;
    const autoStake = false;
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;
    const minOutAmount = 0;
    const delay = 2;
    const expectedPriceLast = 100174811;
    const expectedPriceHistory = 100174811;

    const expectedOutAmAmt = 99974432;
    const expectedFee = 100074;
    const expectedOutPrAmt = 0;

    const lpStable = address(this.accounts.lpStable, chainId);

    const put = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
        { assetId: this.usdnAssetId, amount: usdnAmount },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: false },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(put, {});
    await ni.waitForTx(put.id, { apiBase });

    const putOneTkn = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
      ],
      call: {
        function: 'putOneTknV2',
        args: [
          { type: 'integer', value: minOutAmount },
          { type: 'boolean', value: autoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putOneTkn, {});
    const { height } = await ni.waitForTx(putOneTkn.id, { apiBase });

    await ni.waitForHeight(height + delay, { apiBase });

    const getOneTkn = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.lpStableAssetId, amount: outLp },
      ],
      call: {
        function: 'getOneTknV2',
        args: [
          { type: 'string', value: this.usdtAssetId },
          { type: 'integer', value: minOutAmount },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getOneTkn, {});
    const {
      height: heightAfterGetOneTkn,
      stateChanges,
      id,
    } = await ni.waitForTx(getOneTkn.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(heightAfterGetOneTkn);
    const keyPriceHistory = `%s%s%d%d__price__history__${heightAfterGetOneTkn}__${timestamp}`;
    const lpStableState = await api.addresses.data(lpStable);

    expect(lpStableState).to.include.deep.members([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${expectedOutAmAmt}__${expectedOutPrAmt}__${outLp}__${expectedPriceLast}__${heightAfterGetOneTkn}__${timestamp}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistory,
    }, {
      key: '%s__dLpRefreshedHeight',
      type: 'integer',
      value: heightAfterGetOneTkn,
    }, {
      key: '%s__dLp',
      type: 'string',
      value: '10000000127432425026570490178',
    }]);

    expect(flattenTransfers(stateChanges)).to.deep.include.members([
      {
        address: address(this.accounts.user1, chainId),
        asset: this.usdtAssetId,
        amount: expectedOutAmAmt,
      },
      {
        address: address(this.accounts.feeCollector, chainId),
        asset: this.usdtAssetId,
        amount: expectedFee,
      },
    ]);

    expect(flattenInvokesList(stateChanges))
      .to.deep.include.members([
        [address(this.accounts.factoryV2, chainId), 'burn'],
      ]);
  });
});
