import { create } from '@waves/node-api-js';
import { data } from '@waves/waves-transactions';
import { join } from 'path';
import { readdir, unlink, writeFile } from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import config from './config.mjs';

const network = 'mainnet';
const {
  nodeUrl,
  chainId,
  assetsStorePublicKey,
} = config[network];

const assetsStoreAddress = address({ publicKey: assetsStorePublicKey }, chainId);

const nodeApi = create(nodeUrl);

const keyAssetIdToTicker = (assetId) => `%s%s__assetId2ticker__${assetId}`;
const entryAssetIdToTicker = (assetId, ticker = '') => ({ key: keyAssetIdToTicker(assetId), type: 'string', value: ticker });

const keyTickerToAssetId = (ticker) => `%s%s__ticker2assetId__${ticker}`;
const entryTickerToAssetId = (ticker, assetId) => ({ key: keyTickerToAssetId(ticker), type: 'string', value: assetId });

const fetchCurrentState = async () => {
  const assetIdToTicker = await nodeApi.addresses.data(assetsStoreAddress, {
    matches: encodeURIComponent(keyAssetIdToTicker('.+')),
  }, {});

  const tickerToAssetId = await nodeApi.addresses.data(assetsStoreAddress, {
    matches: encodeURIComponent(keyTickerToAssetId('.+')),
  }, {});

  return { assetIdToTicker, tickerToAssetId };
};

const getTxs = async () => {
  const currentState = await fetchCurrentState();
  console.log(currentState);

  const actions = [];

  const chunkSize = 100;
  const actionsChunks = Object.values(actions.reduce((acc, cur, idx) => {
    const chunkIndex = Math.floor(idx / chunkSize);
    return {
      ...acc,
      [chunkIndex]: [...(acc[chunkIndex] || []), cur],
    };
  }, {}));

  return actionsChunks.map((changes) => data({
    data: changes,
    chainId,
    senderPublicKey: assetsStorePublicKey,
    additionalFee: 4e5,
  }));
};

try {
  const txsPath = 'txs';
  // clear txs dir
  const exclude = ['.gitignore'];
  const files = await readdir(txsPath);
  await Promise.all(files.map(async (name) => {
    if (exclude.includes(name)) return name;
    return unlink(join(txsPath, name));
  }));

  // create transactions
  const txs = (await getTxs()).map((tx) => [tx, 'fill_state']);

  // save txs
  await Promise.all(txs.map(async ([tx, name], idx) => {
    await writeFile(join(txsPath, `${idx}${name ? '_' : ''}${name || ''}.json`), JSON.stringify(tx, null, 2));
  }));
} catch (error) {
  console.error(error);
}
