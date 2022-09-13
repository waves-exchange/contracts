import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../utils.mjs';

import {
  otcMultiassetContract,
} from './callables.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
const otcMultiassetPath = format({ dir: ridePath, base: 'multiasset_otc.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'manager',
      'otcMultiasset',
      'user1',
    ];
    this.accounts = Object.fromEntries(
      names.map((item) => [item, randomSeed(seedWordsCount)]),
    );
    const seeds = Object.values(this.accounts);
    const amount = 1e10;
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

    await setScriptFromFile(otcMultiassetPath, this.accounts.otcMultiasset);

    const assetAIssueTx = issue({
      name: 'assetA',
      description: '',
      quantity: 100000e6,
      decimals: 6,
      chainId,
    }, seed);
    await api.transactions.broadcast(assetAIssueTx, {});
    await waitForTx(assetAIssueTx.id, { apiBase });
    this.assetAId = assetAIssueTx.id;

    console.log('assetAId', this.assetAId);

    const assetAAmount = 100e6;
    const massTransferAssetATx = massTransfer({
      transfers: names.slice(-1).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: assetAAmount,
      })),
      assetId: this.assetAId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferAssetATx, {});
    await waitForTx(massTransferAssetATx.id, { apiBase });

    const assetBIssueTx = issue({
      name: 'assetB',
      description: '',
      quantity: 100000e6,
      decimals: 6,
      chainId,
    }, seed);
    await api.transactions.broadcast(assetBIssueTx, {});
    await waitForTx(assetBIssueTx.id, { apiBase });
    this.assetBId = assetBIssueTx.id;

    console.log('assetBId', this.assetBId);

    const assetBAmount = 100e6;
    const massTransferAssetBTx = massTransfer({
      transfers: names.slice(-2).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: assetBAmount,
      })),
      assetId: this.assetBId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferAssetBTx, {});
    await waitForTx(massTransferAssetBTx.id, { apiBase });

    this.withdrawDelay = 2;
    this.depositFee = 3;
    this.withdrawFee = 4;
    this.minAmountDeposit = 5e6;
    this.minAmountWithdraw = 1e6;
    this.pairStatus = 0;

    await otcMultiassetContract.registerAsset(
      address(this.accounts.otcMultiasset, chainId),
      this.accounts.otcMultiasset,
      this.assetAId,
      this.assetBId,
      this.withdrawDelay,
      this.depositFee,
      this.withdrawFee,
      this.minAmountDeposit,
      this.minAmountWithdraw,
      this.pairStatus,
    );

    const setManagerTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager),
      }],
      chainId,
    }, this.accounts.otcMultiasset);
    await api.transactions.broadcast(setManagerTx, {});
    await waitForTx(setManagerTx.id, { apiBase });
  },
};
