import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data, invokeScript,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { setScriptFromFile } from '../utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
const mockRidePath = join('test', 'boosting', 'mock');
const boostingPath = format({ dir: ridePath, base: 'boosting.ride' });
const factoryPath = format({ dir: mockRidePath, base: 'factory.ride' });

export const mochaHooks = {
  async beforeAll() {
    console.log('test preparation');
    const names = [
      'boosting',
      'factory',
      'manager',
      'referrerAddress',
      'mathContract',
      'user1',
    ];
    this.accounts = Object.fromEntries(names.map((item) => [item, randomSeed(seedWordsCount)]));
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

    console.log('setScriptFromFile');
    await setScriptFromFile(boostingPath, this.accounts.boosting);
    await setScriptFromFile(factoryPath, this.accounts.factory);

    console.log('hook execution');
    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(wxIssueTx, {});
    await waitForTx(wxIssueTx.id, { apiBase });
    this.wxAssetId = wxIssueTx.id;
    console.log('wxAssetId', this.wxAssetId);

    const wxAmount = 1e16;
    const massTransferTxWX = massTransfer({
      transfers: names.slice(-1).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });

    const factoryAddressStr = address(this.accounts.factory, chainId);
    const lockAssetIdStr = this.wxAssetId;

    const minLockAmount = 500000000;
    const minDuration = 10;
    const maxDuration = 2102400;
    const mathContract = address(this.accounts.mathContract, chainId);

    const constructorTx = invokeScript({
      dApp: address(this.accounts.boosting, chainId),
      additionalFee: 4e5,
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: factoryAddressStr },
          { type: 'string', value: lockAssetIdStr },
          { type: 'integer', value: minLockAmount },
          { type: 'integer', value: minDuration },
          { type: 'integer', value: maxDuration },
          { type: 'string', value: mathContract },
        ],
      },
      chainId,
    }, this.accounts.boosting);
    await api.transactions.broadcast(constructorTx, {});
    await waitForTx(constructorTx.id, { apiBase });

    const boostingConfig = `%s%d%d%d__${lockAssetIdStr}__${minLockAmount}__${minDuration}__${maxDuration}__${mathContract}`;
    const setConfigTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__config',
        type: 'string',
        value: boostingConfig,
      }],
      chainId,
    }, this.accounts.boosting);
    await api.transactions.broadcast(setConfigTx, {});
    await waitForTx(setConfigTx.id, { apiBase });

    const setManagerBoostingTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager),
      }],
      chainId,
    }, this.accounts.boosting);
    await api.transactions.broadcast(setManagerBoostingTx, {});
    await waitForTx(setManagerBoostingTx.id, { apiBase });
  },
};
