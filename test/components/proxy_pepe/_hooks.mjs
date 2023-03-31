import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
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
const mockRidePath = join('components', 'proxy_pepe', 'mock');
const proxyPepePath = format({ dir: ridePath, base: 'proxy_pepe.ride' });
const sWavesMockPath = format({ dir: mockRidePath, base: 'sWaves.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'proxyPepe',
      'manager',
      'sWaves',
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

    await setScriptFromFile(proxyPepePath, this.accounts.proxyPepe);
    await setScriptFromFile(sWavesMockPath, this.accounts.sWaves);

    const sWavesIssueTx = issue({
      name: 'sWaves',
      description: '',
      quantity: 100000e8,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(sWavesIssueTx, {});
    await waitForTx(sWavesIssueTx.id, { apiBase });
    this.sWavesAssetId = sWavesIssueTx.id;

    const sWavesAmount = 1000e8;
    const massTransferTxWX = massTransfer({
      transfers: [
        { recipient: address(this.accounts.sWaves, chainId), amount: sWavesAmount },
        { recipient: address(this.accounts.user1, chainId), amount: sWavesAmount },
      ],
      assetId: this.sWavesAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });

    const mockConfigDataTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: 'sWaves_assetId',
          type: 'string',
          value: this.sWavesAssetId,
        },
      ],
      chainId,
    }, this.accounts.sWaves);
    await api.transactions.broadcast(mockConfigDataTx, {});
    await waitForTx(mockConfigDataTx.id, { apiBase });

    const setManagerProxyPepeTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__managerPublicKey',
          type: 'string',
          value: publicKey(this.accounts.manager),
        },
        {
          key: '%s__sWavesContract',
          type: 'string',
          value: address(this.accounts.sWaves, chainId),
        },
        {
          key: '%s__sWavesAssetId',
          type: 'string',
          value: this.sWavesAssetId,
        },
      ],
      chainId,
    }, this.accounts.proxyPepe);
    await api.transactions.broadcast(setManagerProxyPepeTx, {});
    await waitForTx(setManagerProxyPepeTx.id, { apiBase });
  },
};
