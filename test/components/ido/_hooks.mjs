import { address, randomSeed } from '@waves/ts-lib-crypto';
import {
  data,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = '../ride';
const mockRidePath = join('components', 'ido', 'mock');
const idoPath = format({ dir: ridePath, base: 'ido.ride' });
const lpStablePath = format({ dir: mockRidePath, base: 'lp_stable.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'lpStable',
      'manager',
      'ido',
      'user1',
    ];
    this.accounts = Object.fromEntries(names.map((item) => [item, randomSeed(seedWordsCount)]));
    const seeds = Object.values(this.accounts);
    const amount = 100e8;
    const massTransferTx = massTransfer({
      transfers: seeds.map((item) => ({ recipient: address(item, chainId), amount })),
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });

    await setScriptFromFile(idoPath, this.accounts.ido);
    await setScriptFromFile(lpStablePath, this.accounts.lpStable);

    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 100000e8,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(wxIssueTx, {});
    await waitForTx(wxIssueTx.id, { apiBase });
    this.wxAssetId = wxIssueTx.id;

    const wxAmount = 1000e8;
    const massTransferTxWX = massTransfer({
      transfers: names.slice(-2).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });

    const usdnIssueTx = issue({
      name: 'USDN',
      description: '',
      quantity: 100000e6,
      decimals: 6,
      chainId,
    }, seed);
    await api.transactions.broadcast(usdnIssueTx, {});
    await waitForTx(usdnIssueTx.id, { apiBase });
    this.usdnAssetId = usdnIssueTx.id;

    const usdnAmount = 1000e6;
    const massTransferTxUSDN = massTransfer({
      transfers: names.slice(-1).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: usdnAmount,
      })),
      assetId: this.usdnAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxUSDN, {});
    await waitForTx(massTransferTxUSDN.id, { apiBase });

    const usdtIssueTx = issue({
      name: 'USDT',
      description: '',
      quantity: 100000e6,
      decimals: 6,
      chainId,
    }, seed);
    await api.transactions.broadcast(usdtIssueTx, {});
    await waitForTx(usdtIssueTx.id, { apiBase });
    this.usdtAssetId = usdtIssueTx.id;

    const { height } = await api.blocks.fetchHeight();
    this.idoStart = height;
    this.idoDuration = 3;
    this.claimStart = this.idoStart + this.idoDuration + 1;
    this.claimDuration = 200;
    this.price = 100e6;
    this.priceMult = 100e6;
    this.priceAssetId58 = this.usdnAssetId;
    this.minInvestAmount = 1e6;
    this.idoAssetId58 = this.wxAssetId;
    this.idoAssetMult = 100e6;
    this.priceAssetMult = 1e6;
    this.periodLength = 3;
    this.totalPeriodAllowance = 1000e6;
    this.userPeriodAllowance = 500e6;
    this.usdtPriceAssetAllowableRatio = 101e6;

    const setIdoKeysTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__config',
        type: 'string',
        value: `%d%d%d%d%d%d%s%d%s%d%d%d__${this.idoStart}__${this.idoDuration}__${this.claimStart}__${this.claimDuration}__${this.price}__${this.priceMult}__${this.idoAssetId58}__${this.idoAssetMult}__${this.priceAssetId58}__${this.priceAssetMult}__${this.minInvestAmount}__100000000000`,
      }, {
        key: '%s__usdtPriceAssetStablePool',
        type: 'string',
        value: address(this.accounts.lpStable, chainId),
      }, {
        key: '%s__usdtAssetId',
        type: 'string',
        value: this.usdtAssetId,
      }, {
        key: '%s__periodLength',
        type: 'integer',
        value: this.periodLength,
      }, {
        key: `%s%s__totalPeriodAllowance__${this.usdnAssetId}`,
        type: 'integer',
        value: this.totalPeriodAllowance,
      }, {
        key: `%s%s__userPeriodAllowance__${this.usdnAssetId}`,
        type: 'integer',
        value: this.userPeriodAllowance,
      }, {
        key: '%s__usdtPriceAssetAllowableRatio',
        type: 'integer',
        value: this.usdtPriceAssetAllowableRatio,
      }],
      chainId,
    }, this.accounts.ido);
    await api.transactions.broadcast(setIdoKeysTx, {});
    await waitForTx(setIdoKeysTx.id, { apiBase });
  },
};
