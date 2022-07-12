import axios from 'axios';
import { create } from '@waves/node-api-js';
import { data } from '@waves/waves-transactions';
import { join } from 'path';
import { writeFile, readdir, unlink } from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import prompts from 'prompts';
import ora from 'ora';
import config from './config.mjs';

const { network } = await prompts({
  type: 'select',
  name: 'network',
  message: 'Network',
  choices: [
    { title: 'mainnet', value: 'mainnet' },
    { title: 'testnet', value: 'testnet' },
  ],
  initial: 0,
});

const {
  nodeUrl,
  tokensWithLabelsUrl,
  chainId,
  assetsStorePublicKey,
  votingVerifiedPublicKey,
} = config[network];

const assetsStoreAddress = address({ publicKey: assetsStorePublicKey }, chainId);
const votingVerifiedAddress = address({ publicKey: votingVerifiedPublicKey }, chainId);

const nodeApi = create(nodeUrl);

const fetchTokensWithLabelsHelper = async (after = '') => {
  const { data: responseData } = await axios.get(`${tokensWithLabelsUrl}&after=${after}`);
  if (responseData.cursor === null) return responseData.data;
  return [...responseData.data, ...await fetchTokensWithLabelsHelper(responseData.cursor)];
};

const fetchTokensWithLabels = async () => {
  const tokensInfoRaw = await fetchTokensWithLabelsHelper();
  return tokensInfoRaw
    .filter(({ type, data: { id } }) => type === 'asset' && id !== 'WAVES')
    .map(({ data: d, metadata }) => ({ id: d.id, ticker: d.ticker, labels: metadata.labels }));
};

const fecthCurrentState = async () => {
  const currentState = await nodeApi.addresses.data(assetsStoreAddress);
  return currentState.reduce((acc, item) => ({ ...acc, [item.key]: item }), {});
};

const fecthVotingVerifiedAssets = async () => {
  const verifiedAssets = await nodeApi.addresses.data(votingVerifiedAddress, { matches: encodeURIComponent('%s%s__verified__.+') });
  return verifiedAssets.map(({ key }) => key.split('__')[2]);
};

const keyCreated = (assetId) => `created_<${assetId}>`;
const entryCreated = (assetId, value = true) => ({ key: keyCreated(assetId), type: 'boolean', value });

const keyVerified = (assetId) => `status_<${assetId}>`;
const entryVerified = (assetId, value = 2) => ({ key: keyVerified(assetId), type: 'integer', value });

const keyAssetIdToTicker = (assetId) => `%s%s__assetId2ticker__${assetId}`;
const entryAssetIdToTicker = (assetId, ticker = '') => ({ key: keyAssetIdToTicker(assetId), type: 'string', value: ticker });

const keyTickerToAssetId = (ticker) => `%s%s__ticker2assetId__${ticker}`;
const entryTickerToAssetId = (ticker, assetId) => ({ key: keyTickerToAssetId(ticker), type: 'string', value: assetId });

const keyAssetLabels = (assetId) => `%s%s__labels__${assetId}`;
const entryAssetLabels = (assetId, labels = []) => ({ key: keyAssetLabels(assetId), type: 'string', value: labels.join('__') });

const getAssetsStoreLabelsAndStatusesTxs = async () => {
  const waVerified = 'WA_VERIFIED';
  const communityVerified = 'COMMUNITY_VERIFIED';
  const currentState = await fecthCurrentState();
  const tokensWithLabelsInfo = await fetchTokensWithLabels();
  const votingVerifiedAssets = await fecthVotingVerifiedAssets();

  const createAssetsActions = tokensWithLabelsInfo.reduce((acc, { id, ticker, labels }) => {
    const isVotingVerified = votingVerifiedAssets.includes(id);
    const isWaVerified = labels.includes(waVerified);
    const status = isVotingVerified || isWaVerified ? 2 : 0;

    const createdEntry = keyCreated(id) in currentState ? [] : [entryCreated(id)];

    const verifiedEntry = [entryVerified(id, status)];

    const tickerIsEmptyOrExists = ticker === null || (keyAssetIdToTicker(id) in currentState && currentState[keyAssetIdToTicker(id)].value !== '');
    const tickerEntries = tickerIsEmptyOrExists ? [] : [
      entryAssetIdToTicker(id, ticker), entryTickerToAssetId(ticker, id),
    ];

    const newLabels = labels.filter((item) => item !== communityVerified);
    if (isWaVerified || isVotingVerified) {
      newLabels.push(communityVerified);
    }
    const labelsEntry = [entryAssetLabels(id, newLabels)];

    return [...acc, ...createdEntry, ...verifiedEntry, ...tickerEntries, ...labelsEntry];
  }, []);

  const actions = [...createAssetsActions];

  const chunkSize = 100;
  const actionsChunks = Object.values(actions.reduce((acc, cur, idx) => {
    const chunkIndex = Math.floor(idx / chunkSize);
    return { ...acc, [chunkIndex]: [...(acc[chunkIndex] || []), cur] };
  }, {}));
  const dataTxs = actionsChunks.map((changes) => data({
    data: changes, chainId, senderPublicKey: assetsStorePublicKey, additionalFee: 4e5,
  }));

  return dataTxs;
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
    const spinner = ora('Cleanup').start();
    const exclude = ['.gitignore'];
    const files = await readdir(txsPath);
    await Promise.all(files.map(async (name) => {
      if (exclude.includes(name)) return name;
      return unlink(join(txsPath, name));
    }));
    spinner.succeed();
  }

  const txsCreationSpinner = ora('Create transactions').start();

  // create transactions
  const txs = [];

  txs.push(...(await getAssetsStoreLabelsAndStatusesTxs()).map((tx) => [tx, 'fill_state']));

  txsCreationSpinner.succeed();

  const txsSavingSpinner = ora('Saving transactions').start();
  // save txs
  await Promise.all(txs.map(async ([tx, name], idx) => {
    await writeFile(join(txsPath, `${idx}${name ? '_' : ''}${name || ''}.json`), JSON.stringify(tx, null, 2));
  }));
  txsSavingSpinner.succeed();
} catch (error) {
  console.error(error);
}
