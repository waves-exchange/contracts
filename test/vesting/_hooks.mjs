import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data, invokeScript, issue, massTransfer, nodeInteraction as ni,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../utils.mjs';

const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
const vestingPath = format({ dir: ridePath, base: 'vesting.ride' });

export const mochaHooks = {
  async beforeAll() {
    const contractNames = ['vesting'];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'manager'];
    this.accounts = Object.fromEntries(names.map((item) => [item, randomSeed(seedWordsCount)]));
    const seeds = Object.values(this.accounts);
    const amount = 1e10;

    const massTransferTx = massTransfer({
      transfers: seeds.map((item) => ({ recipient: address(item, chainId), amount })),
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTx, {});
    await ni.waitForTx(massTransferTx.id, { apiBase });
    await setScriptFromFile(vestingPath, this.accounts.vesting);

    const issueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 10e16,
      decimals: 8,
      chainId,
    }, this.accounts.manager);
    this.wxAssetId = issueTx.id;
    await api.transactions.broadcast(issueTx, {});
    await ni.waitForTx(issueTx.id, { apiBase });

    const wxAmount = 1e16;
    const massTransferTxWx = massTransfer({
      transfers: names.map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(massTransferTxWx, {});
    await ni.waitForTx(massTransferTxWx.id, { apiBase });

    const invokeTx = invokeScript({
      dApp: address(this.accounts.vesting, chainId),
      additionalFee: 4e5,
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: this.wxAssetId },
        ],
      },
      chainId,
    }, this.accounts.vesting);
    await api.transactions.broadcast(invokeTx, {});
    await ni.waitForTx(invokeTx.id, { apiBase });

    const setManagerTx = data({
      dApp: address(this.accounts.vesting, chainId),
      additionalFee: 4e5,
      data: [{
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager),
      }],
      chainId,
    }, this.accounts.vesting);
    await api.transactions.broadcast(setManagerTx, {});
    await ni.waitForTx(setManagerTx.id, { apiBase });
  },
};
