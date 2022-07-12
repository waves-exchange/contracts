import { create } from '@waves/node-api-js';
import { data } from '@waves/waves-transactions';
import { join } from 'path';
import { readdir, unlink, writeFile } from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import prompts from 'prompts';
import config from './config.mjs';

const { network } = await prompts({
  type: 'select',
  name: 'network',
  message: 'Network',
  choices: [
    {
      title: 'mainnet',
      value: 'mainnet',
    },
    {
      title: 'testnet',
      value: 'testnet',
    },
  ],
  initial: 0,
});

const {
  nodeUrl,
  factoryPublicKey,
  chainId,
  assetsStorePublicKey,
} = config[network];

const assetsStoreAddress = address({ publicKey: assetsStorePublicKey }, chainId);
const factoryAddress = address({ publicKey: factoryPublicKey }, chainId);

const nodeApi = create(nodeUrl);

const fetchCurrentState = async () => {
  const currentState = await nodeApi.addresses.data(assetsStoreAddress, {}, {});
  return currentState.reduce((acc, item) => ({
    ...acc,
    [item.key]: item,
  }), {});
};

const fetchLpTokens = async () => {
  const { value: tokensListString } = await nodeApi.addresses.fetchDataKey(factoryAddress, '%s__lpTokensList', {});
  return tokensListString.split('__');
};

const keyAssetLabels = (assetId) => `%s%s__labels__${assetId}`;
const entryAssetLabels = (assetId, labels = []) => ({
  key: keyAssetLabels(assetId),
  type: 'string',
  value: labels.join('__'),
});

const getAssetsStoreLabelsTxs = async () => {
  const gateway = 'GATEWAY';
  const poolsLp = 'POOLS_LP';
  const currentState = await fetchCurrentState();
  const lpTokens = await fetchLpTokens();

  const actions = [
    entryAssetLabels('WAVES', [gateway]),
    ...lpTokens.reduce((acc, assetId) => {
      let oldLabels = [];
      if (keyAssetLabels(assetId) in currentState && currentState[keyAssetLabels(assetId)].value !== '') {
        oldLabels = currentState[keyAssetLabels(assetId)].value.split('__');
      }
      if (oldLabels.includes(poolsLp)) return acc;
      // const newLabels = [...new Set([poolsLp, ...oldLabels])];
      const newLabels = [poolsLp];
      return [entryAssetLabels(assetId, newLabels), ...acc];
    }, []),
  ];

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
  const txs = (await getAssetsStoreLabelsTxs()).map((tx) => [tx, 'fill_state']);

  // save txs
  await Promise.all(txs.map(async ([tx, name], idx) => {
    await writeFile(join(txsPath, `${idx}${name ? '_' : ''}${name || ''}.json`), JSON.stringify(tx, null, 2));
  }));
} catch (error) {
  console.error(error);
}
