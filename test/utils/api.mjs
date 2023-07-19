import { create } from '@waves/node-api-js';
import { nodeInteraction } from '@waves/waves-transactions';

export const {
  API_NODE_URL: apiBase,
  CHAIN_ID: chainId,
  BASE_SEED: baseSeed,
} = process.env;

export const api = create(apiBase);
export const largeNumbeConvertHeader = {
  headers: { Accept: 'application/json;large-significand-format=string' },
};

export const separator = '__';

export const broadcastAndWait = async (tx) => {
  await api.transactions.broadcast(tx, {});
  await nodeInteraction.waitForTx(tx.id, { apiBase });
  return api.transactions.fetchInfo(tx.id);
};

export const waitForTx = (txId) => nodeInteraction.waitForTx(txId, { apiBase });

export const waitForHeight = (height) => nodeInteraction.waitForHeight(height, { apiBase });

export const waitNBlocks = (
  blocksCount,
  timeout = null,
) => nodeInteraction.waitNBlocks(blocksCount, { apiBase, timeout });
