import { create } from '@waves/node-api-js';
import { data } from '@waves/waves-transactions';
import { join } from 'path';
import { readdir, unlink, writeFile } from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import prompts from 'prompts';
import {
  nodeUrl, chainId, oldFactoryAddress, assetsStorePublicKey,
} from './config.mjs';

const assetsStoreAddress = address({ publicKey: assetsStorePublicKey }, chainId);

const nodeApi = create(nodeUrl);

const fetchCurrentState = async () => (await nodeApi.addresses.data(assetsStoreAddress, {}, {}))
  .reduce((acc, item) => ({
    ...acc,
    [item.key]: item,
  }), {});

const fetchOldLpTokens = async () => (await nodeApi.addresses.data(
  oldFactoryAddress,
  { matches: encodeURIComponent('.+__poolContract2LpAsset') },
  {},
)).map(({ value }) => value);

const keyCreated = (assetId) => `created_<${assetId}>`;
const keyStatus = (assetId) => `status_<${assetId}>`;
const keyLabels = (assetId) => `%s%s__labels__${assetId}`;

const keyTickerToAssetId = (ticker) => `%s%s__ticker2assetId__${ticker}`;
const keyAssetIdToTicker = (assetId) => `%s%s__assetId2ticker__${assetId}`;

const splitActions = (actions) => {
  const chunkSize = 100;
  return Object.values(actions.reduce((acc, cur, idx) => {
    const chunkIndex = Math.floor(idx / chunkSize);
    return {
      ...acc,
      [chunkIndex]: [...(acc[chunkIndex] || []), cur],
    };
  }, {}));
};

const getRemoveOldLpTokensTxs = async () => {
  const currentState = await fetchCurrentState();
  const oldLpTokens = await fetchOldLpTokens();
  const keysToRemove = [
    keyCreated, keyStatus, keyLabels, keyAssetIdToTicker,
  ];

  const actions = [];
  for (const assetId of oldLpTokens) {
    for (const keyFn of keysToRemove) {
      const key = keyFn(assetId);
      if (key in currentState) {
        actions.push({ key });
      }
    }
  }

  const actionsChunks = splitActions(actions);

  return actionsChunks.map((changes) => data({
    data: changes,
    chainId,
    senderPublicKey: assetsStorePublicKey,
    additionalFee: 4e5,
  }));
};

const getFixLpTokensTxs = async () => {
  const tokensToFix = {
    Fm4qczu6Pepz8KUhh3Heb6LeTVfpSMX5vvNgw3x764CS: 'USDTUSDNLP',
    '2RmyyZ39ZoPoTWksM6urmjgx9mB8ksP8Ru6ba8u89mZm': 'BTCUSDNLP',
    '9ZkS8GoUWn69QhgF1RsRtS9CFtc7ZbDNX5N238Jmqjdr': 'ETHUSDNLP',
  };

  const actions = [];
  for (const assetId in tokensToFix) {
    if (tokensToFix.hasOwn(assetId)) {
      actions.push(
        { key: keyCreated(assetId), type: 'boolean', value: true },
        { key: keyStatus(assetId), type: 'integer', value: 2 },
        { key: keyAssetIdToTicker(assetId), type: 'string', value: tokensToFix[assetId] },
        { key: keyTickerToAssetId(tokensToFix[assetId]), type: 'string', value: assetId },
      );
    }
  }

  const actionsChunks = splitActions(actions);

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
  const { clear } = await prompts({
    type: 'toggle',
    name: 'clear',
    message: 'Clear txs dir?',
    initial: true,
    active: 'yes',
    inactive: 'no',
  });
  if (clear) {
    const exclude = ['.gitignore'];
    const files = await readdir(txsPath);
    await Promise.all(files.map(async (name) => {
      if (exclude.includes(name)) return name;
      return unlink(join(txsPath, name));
    }));
  }

  // create transactions
  const txs = [];
  txs.push(...(await getRemoveOldLpTokensTxs()).map((tx) => [tx, 'remove_old_tokens']));
  txs.push(...(await getFixLpTokensTxs()).map((tx) => [tx, 'fix_broken_tokens']));

  // save txs
  await Promise.all(txs.map(async ([tx, name], idx) => {
    await writeFile(join(txsPath, `${idx}${name ? '_' : ''}${name || ''}.json`), JSON.stringify(tx, null, 2));
  }));
} catch (error) {
  console.error(error);
}
