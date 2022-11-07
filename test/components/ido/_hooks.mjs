import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data, invokeScript,
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
      'ido',
      'lpStable',
      'manager',
      'wxOwner',
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

    console.log('account addresses:');
    for (const [key, value] of Object.entries(this.accounts)) {
      console.log('  ', key, address(value, chainId));
    }

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

    // const usdtAmount = 1000e6;
    // const massTransferTxUSDT = massTransfer({
    //   transfers: names.slice(-1).map((name) => ({
    //     recipient: address(this.accounts[name], chainId), amount: usdnAmount,
    //   })),
    //   assetId: this.usdtAssetId,
    //   chainId,
    // }, seed);
    // await api.transactions.broadcast(massTransferTxUSDT, {});
    // await waitForTx(massTransferTxUSDT.id, { apiBase });

    console.log('   usdnAssetId', this.usdnAssetId);
    console.log('   usdtAssetId', this.usdtAssetId);
    console.log('   wxAssetId', this.wxAssetId);

    const { height } = await api.blocks.fetchHeight();
    this.idoStart = height;
    this.idoDuration = 3;
    this.claimStart = this.idoStart + this.idoDuration + 1;
    this.claimDuration = 200;
    this.price = 100e6;
    this.priceAssetId58 = this.usdnAssetId;
    this.minInvestAmount = 1e6;

    const constructorTx = invokeScript({
      dApp: address(this.accounts.ido, chainId),
      payment: [
        { assetId: this.wxAssetId, amount: wxAmount },
      ],
      additionalFee: 4e5,
      call: {
        function: 'constructor',
        args: [
          { type: 'integer', value: this.idoStart },
          { type: 'integer', value: this.idoDuration },
          { type: 'integer', value: this.claimStart },
          { type: 'integer', value: this.claimDuration },
          { type: 'integer', value: this.price },
          { type: 'string', value: this.priceAssetId58 },
          { type: 'integer', value: this.minInvestAmount },
        ],
      },
      chainId,
    }, this.accounts.wxOwner);
    await api.transactions.broadcast(constructorTx, {});
    await waitForTx(constructorTx.id, { apiBase });

    this.periodLength = 3;
    this.totalPeriodAllowance = 1000e6;
    this.userPeriodAllowance = 500e6;
    this.usdtPriceAssetAllowableRatio = 101e6;

    const setIdoKeysTx = data({
      additionalFee: 4e5,
      data: [{
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

    const setManagerIdoTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager),
      }],
      chainId,
    }, this.accounts.ido);
    await api.transactions.broadcast(setManagerIdoTx, {});
    await waitForTx(setManagerIdoTx.id, { apiBase });
  },
};
