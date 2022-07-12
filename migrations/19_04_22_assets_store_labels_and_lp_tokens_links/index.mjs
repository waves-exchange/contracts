import axios from 'axios';
import { create } from '@waves/node-api-js';
import { data, invokeScript, setScript } from '@waves/waves-transactions';
import { join } from 'path';
import ride from '@waves/ride-js';
import {
  readFile, writeFile, readdir, unlink,
} from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import prompts from 'prompts';
import ora from 'ora';
import config from './config.mjs';

const { network } = await prompts({
  type: 'select',
  name: 'network',
  message: 'Network',
  choices: [
    { title: 'testnet', value: 'testnet' },
    { title: 'mainnet', value: 'mainnet' },
  ],
  initial: 0,
});

const {
  nodeUrl,
  tokensWithLabelsUrl,
  chainId,
  managerPublicKey,
  assetsStorePublicKey,
  userPoolsPublicKey,
  factoryPublicKey,
  votingVerifiedPublicKey,
  wxAssetId,
  usdnAssetId,
} = config[network];

const factoryAddress = address({ publicKey: factoryPublicKey }, chainId);
const assetsStoreAddress = address({ publicKey: assetsStorePublicKey }, chainId);
const userPoolsAddress = address({ publicKey: userPoolsPublicKey }, chainId);

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

const fetchPoolAssets = async () => {
  const data2 = await nodeApi.addresses.data(factoryAddress, { matches: encodeURIComponent('%d%d%s__\\d+__\\d+__config') });
  return data2.map(({ value }) => {
    const [,,, lpAsset, amountAsset, priceAsset] = value.split('__');
    return { lpAsset, amountAsset, priceAsset };
  }).filter((item) => item.amountAsset !== 'WAVES');
};

const fecthCurrentState = async () => {
  const currentState = await nodeApi.addresses.data(factoryAddress);
  return currentState.reduce((acc, item) => ({ ...acc, [item.key]: item }), {});
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

const keyAmountAndPriceAssetsToLpAsset = (amountAsset, priceAsset) => `%s%s%s__amountAndPriceAssetsToLpAsset__${amountAsset}__${priceAsset}`;
const entryAmountAndPriceAssetsToLpAsset = (amountAsset, priceAsset, lpAsset) => ({ key: keyAmountAndPriceAssetsToLpAsset(amountAsset, priceAsset), type: 'string', value: lpAsset });

const keyLpAssetToAmountAndPriceAssets = (lpAsset) => `%s%s__lpAssetToAmountAndPriceAssets__${lpAsset}`;
const entryLpAssetToAmountAndPriceAssets = (lpAsset, amountAsset, priceAsset) => ({ key: keyLpAssetToAmountAndPriceAssets(lpAsset), type: 'string', value: `${amountAsset}__${priceAsset}` });

const keyAssetPoolsNumber = (assetId) => `%s%s__pools__${assetId}`;
const entryAssetPoolsNumber = (assetId, value) => ({ key: keyAssetPoolsNumber(assetId), type: 'integer', value });

const getAssetsStoreLabelsAndLpTokensLinksTxs = async () => {
  const waVerified = 'WA_VERIFIED';
  const communityVerified = 'COMMUNITY_VERIFIED';
  const currentState = await fecthCurrentState();
  const tokensWithLabelsInfo = await fetchTokensWithLabels();
  const poolsAssetsInfo = await fetchPoolAssets();

  const createAssetsActions = tokensWithLabelsInfo.reduce((acc, { id, ticker, labels }) => {
    const createdEntry = keyCreated(id) in currentState ? [] : [entryCreated(id)];

    const verifiedEntry = keyVerified(id) in currentState ? [] : [entryVerified(id)];

    const tickerIsEmptyOrExists = ticker === null || (keyAssetIdToTicker(id) in currentState && currentState[keyAssetIdToTicker(id)].value !== '');
    const tickerEntries = tickerIsEmptyOrExists ? [] : [
      entryAssetIdToTicker(id, ticker), entryTickerToAssetId(ticker, id),
    ];

    const labelsExists = keyAssetLabels(id) in currentState && currentState[keyAssetLabels(id)].value !== '';
    const labelsFromState = labelsExists ? currentState[keyAssetLabels(id)].value.split('__') : [];
    const newLabels = [
      ...new Set([
        ...labels,
        ...labelsFromState,
      ].map((item) => (item === waVerified ? communityVerified : item))),
    ];
    const labelsShouldBeSet = newLabels.length > 0 && (
      labelsFromState.length !== newLabels.length || allLabels.includes(waVerified)
    );
    const labelsEntry = labelsShouldBeSet ? [entryAssetLabels(id, newLabels)] : [];

    return [...acc, ...createdEntry, ...verifiedEntry, ...tickerEntries, ...labelsEntry];
  }, []);

  const { lpLinksActions, poolsNumber } = poolsAssetsInfo
    .reduce(({ lpLinksActions: lpla, poolsNumber: pn }, { lpAsset, amountAsset, priceAsset }) => {
      const newLpLinksActions = [
        ...lpla, entryAmountAndPriceAssetsToLpAsset(amountAsset, priceAsset, lpAsset),
        entryLpAssetToAmountAndPriceAssets(lpAsset, amountAsset, priceAsset),
      ];
      const newPoolsNumber = { ...pn, [amountAsset]: (pn[amountAsset] || 0) + 1 };
      return { lpLinksActions: newLpLinksActions, poolsNumber: newPoolsNumber };
    }, { lpLinksActions: [], poolsNumber: {} });

  const poolsNumberActions = Object.entries(poolsNumber)
    .map(([id, number]) => entryAssetPoolsNumber(id, number));

  const actions = [...createAssetsActions, ...lpLinksActions, ...poolsNumberActions];

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
  const ridePath = '../../ride';

  // factory set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'factory_v2.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: factoryPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'factory_set_script']);

  // factory constructor
  txs.push([invokeScript({
    dApp: factoryAddress,
    call: {
      function: 'constructorV5',
      args: [{ type: 'string', value: assetsStoreAddress }],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'factory_constructor_v5']);

  // factory set admins
  const factoryAdminsRaw = await nodeApi.addresses.fetchDataKey(factoryAddress, '%s__adminPubKeys').catch(() => null);
  const factoryAdmins = factoryAdminsRaw ? factoryAdminsRaw.value.split('__') : [];
  txs.push([invokeScript({
    dApp: factoryAddress,
    call: {
      function: 'setAdmins',
      args: [{ type: 'list', value: [...factoryAdmins, userPoolsPublicKey].map((value) => ({ type: 'string', value })) }],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'factory_set_admins']);

  // user pools set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'user_pools.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: userPoolsPublicKey,
    chainId,
  }), 'user_pools_set_script']);

  // user pools constructor
  txs.push([invokeScript({
    dApp: userPoolsAddress,
    call: {
      function: 'constructor',
      args: [
        { type: 'string', value: factoryAddress }, // factoryV2Address: String
        { type: 'string', value: assetsStoreAddress }, // assetsStoreAddress: String
        { type: 'list', value: [{ type: 'string', value: usdnAssetId }] }, // priceAssetIds: List[String]
        { type: 'list', value: [{ type: 'string', value: 1e10.toString() }] }, // priceAssetsMinAmount: List[String]
        { type: 'integer', value: 1e5 }, // amountAssetMinAmount: Int
        { type: 'string', value: wxAssetId }, // feeAssetId: String
        { type: 'integer', value: 1e9 }, // feeAmount: Int
      ],
    },
    senderPublicKey: userPoolsPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'user_pools_constructor']);

  // user pools set manager
  txs.push([invokeScript({
    dApp: userPoolsAddress,
    call: {
      function: 'setManager',
      args: [
        { type: 'string', value: managerPublicKey },
      ],
    },
    senderPublicKey: userPoolsPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'user_pools_set_manager']);

  // user pools confirm manager
  txs.push([invokeScript({
    dApp: userPoolsAddress,
    call: {
      function: 'confirmManager',
      args: [],
    },
    senderPublicKey: managerPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'user_pools_confirm_manager']);

  // assets store set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'assets_store.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: assetsStorePublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'assets_store_set_script']);

  // assets store set admins
  const assetStoreAdminsRaw = await nodeApi.addresses.fetchDataKey(assetsStoreAddress, '%s__adminPubKeys').catch(() => null);
  const assetStoreAdmins = assetStoreAdminsRaw ? assetStoreAdminsRaw.value.split('__') : [];
  txs.push([invokeScript({
    dApp: assetsStoreAddress,
    call: {
      function: 'setAdmins',
      args: [{ type: 'list', value: [...assetStoreAdmins, userPoolsPublicKey].map((value) => ({ type: 'string', value })) }],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'assets_store_set_admins']);

  // voting verified set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'voting_verified.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: votingVerifiedPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'voting_verified_set_script']);

  txs.push(...(await getAssetsStoreLabelsAndLpTokensLinksTxs()).map((tx) => [tx, 'fill_state']));

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
