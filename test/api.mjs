import { create } from '@waves/node-api-js';
import { nodeInteraction } from '@waves/waves-transactions';

const apiBase = process.env.API_NODE_URL;

export const chainId = 'R';
export const api = create(apiBase);

export const broadcastAndWait = async (tx) => {
  await api.transactions.broadcast(tx, {});
  await nodeInteraction.waitForTx(tx.id, { apiBase });
  return api.transactions.fetchInfo(tx.id);
};

export const waitForTx = (txId) => nodeInteraction.waitForTx(txId, { apiBase });

export const waitForHeight = (height) => nodeInteraction.waitForHeight(height, { apiBase });
