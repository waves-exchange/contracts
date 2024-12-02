import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { flattenInvokesList } from './contract/tools.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_stable: putForFree.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully put without lp emission', async function () {
    const usdnAmount = 1e16 / 10;
    const usdtAmount = 1e8 / 10;
    const expectedLpAmount = 0;
    const priceLast = 1e16;
    const priceHistory = 1e16;
    // TODO calculate dLp

    const lpStable = address(this.accounts.lpStable, chainId);
    const userAddress = address(this.accounts.user1, chainId);

    const initPut = invokeScript({
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
    await api.transactions.broadcast(initPut, {});
    await ni.waitForTx(initPut.id, { apiBase });

    const userBeforeBalance = await api.assets
      .fetchBalanceAddressAssetId(userAddress, this.lpStableAssetId);

    const put = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
        { assetId: this.usdnAssetId, amount: usdnAmount },
      ],
      call: {
        function: 'putForFree',
        args: [
          { type: 'integer', value: 1000000 },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(put, {});
    const { height, stateChanges, id } = await ni.waitForTx(put.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);
    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    const lpStableState = await api.addresses.data(lpStable);
    const userAfterBalance = await api.assets
      .fetchBalanceAddressAssetId(userAddress, this.lpStableAssetId);

    expect(lpStableState).to.include.deep.members([{
      key: '%s%s__price__last',
      type: 'integer',
      value: priceLast.toString(),
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: priceHistory.toString(),
    }, {
      key: `%s%s%s__P__${address(this.accounts.user1, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${expectedLpAmount}__${priceLast}__1000000__1000000__${height}__${timestamp}__0__0`,
    }, {
      key: '%s__dLpRefreshedHeight',
      type: 'integer',
      value: height,
    }, {
      key: '%s__dLp',
      type: 'string',
      value: '20000000000000006240543774034',
    }]);

    expect(Number(userAfterBalance.balance))
      .to.eql(Number(userBeforeBalance.balance) + expectedLpAmount);

    expect(flattenInvokesList(stateChanges))
      .to.deep.not.include.members([
        [address(this.accounts.factoryV2, chainId), 'emit'],
      ]);
  });
});
