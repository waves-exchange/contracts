import { create } from '@waves/node-api-js';
import { data, invokeScript } from '@waves/waves-transactions';
import { writeFile } from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import { Level } from 'level';
import config, { dbName } from './config.mjs';

const db = new Level(dbName, { valueEncoding: 'json' });

const networkEnvVariableName = 'NETWORK';
const network = process.env[networkEnvVariableName];
const networkAllowedValues = ['mainnet', 'testnet'];
if (!networkAllowedValues.includes(network)) {
  throw new Error(`Specify ${networkEnvVariableName} environment variable. Allowed values: ${networkAllowedValues.join(',')}`);
}

const {
  nodeUrl,
  factoryPublicKey,
  votingEmissionPublicKey,
  userPoolsPublicKey,
  chainId,
} = config[network];

const factoryAddress = address({ publicKey: factoryPublicKey }, chainId);
const votingEmissionAddress = address({ publicKey: votingEmissionPublicKey }, chainId);
const userPoolsAddress = address({ publicKey: userPoolsPublicKey }, chainId);

const nodeApi = create(nodeUrl);

const fetchCurrentState = async (targetAddress) => {
  const currentState = await nodeApi.addresses.data(targetAddress, {}, {});
  return currentState.reduce((acc, item) => ({
    ...acc,
    [item.key]: item,
  }), {});
};

const keyWxEmissionLabel = ({ amountAsset, priceAsset }) => `%s%s%s__wxEmission__${amountAsset}__${priceAsset}`;
const entryWxEmissionLabel = (assets) => ({
  key: keyWxEmissionLabel(assets),
  type: 'boolean',
  value: true,
});
const keyUserPoolStatus = (amountAssetId, priceAssetId) => `%s%s%s__status__${amountAssetId}__${priceAssetId}`;
const keyPoolWeightRegExp = /%s%s__poolWeight__[a-zA-Z0-9]+$/;
const keyPoolWeightGwxVirtualPool = '%s%s__poolWeight__GWXvirtualPOOL';
const keyPoolToAssets = (poolAddress) => `%s%s%s__${poolAddress}__mappings__poolContract2PoolAssets`;
const keyInternalToBaseAssetId = (id) => `%s%s%d__mappings__internal2baseAssetId__${id}`;

const getPoolsWithWeight = async (currentState, userPoolsState) => {
  const poolsAddressesWithWeight = Object.values(currentState)
    .filter(({ key }) => keyPoolWeightRegExp.test(key)
      && key !== keyPoolWeightGwxVirtualPool);
  const poolsWithWeight = poolsAddressesWithWeight
    .map(({ key, value: weight }) => {
      const poolAddress = key.split('__')[2];
      const [, amountAssetInternal, priceAssetInternal] = currentState[keyPoolToAssets(poolAddress)].value.split('__');
      const { value: amountAsset } = currentState[keyInternalToBaseAssetId(amountAssetInternal)];
      const { value: priceAsset } = currentState[keyInternalToBaseAssetId(priceAssetInternal)];
      return {
        amountAsset,
        priceAsset,
        weight,
      };
    })
    .filter(({ amountAsset, priceAsset }) => {
      const isUserPool = keyUserPoolStatus(amountAsset, priceAsset) in userPoolsState;
      return !isUserPool;
    });

  return poolsWithWeight;
};

const getWxEmissionLabelTxs = async (factoryState, poolsWithWeight) => {
  const actions = poolsWithWeight
    .filter((assets) => !(keyWxEmissionLabel(assets) in factoryState))
    .map((assets) => entryWxEmissionLabel(assets));

  const chunkSize = 100;
  const actionsChunks = Object.values(actions.reduce((acc, cur, idx) => {
    const chunkIndex = Math.floor(idx / chunkSize);
    return {
      ...acc,
      [chunkIndex]: [...(acc[chunkIndex] || []), cur],
    };
  }, {}));

  const txs = actionsChunks.map((changes) => data({
    data: changes,
    chainId,
    senderPublicKey: factoryPublicKey,
    additionalFee: 4e5,
  }));

  return txs;
};

const keyInList = ({ amountAsset, priceAsset }) => `%s%s%s__inList__${amountAsset}__${priceAsset}`;

const getVotingEmissionCreateTxs = async (votingEmissionState, poolsWithWeight) => {
  const txs = poolsWithWeight
    .filter((assets) => !(keyInList(assets) in votingEmissionState))
    .map(({ amountAsset, priceAsset }) => invokeScript({
      dApp: votingEmissionAddress,
      call: {
        function: 'create',
        args: [
          { type: 'string', value: amountAsset },
          { type: 'string', value: priceAsset },
        ],
      },
      additionalFee: 4e5,
      chainId,
      senderPublicKey: votingEmissionPublicKey, // or manager
    }));

  return txs;
};

try {
  const factoryState = await fetchCurrentState(factoryAddress);
  const votingEmissionState = await fetchCurrentState(votingEmissionAddress);
  const userPoolsState = await fetchCurrentState(userPoolsAddress);
  const poolsWithWeight = await getPoolsWithWeight(factoryState, userPoolsState);
  // create transactions
  const txsAuto = await getVotingEmissionCreateTxs(votingEmissionState, poolsWithWeight);
  const txsManual = await getWxEmissionLabelTxs(factoryState, poolsWithWeight);

  // save txs
  await db.clear();
  await db.batch(txsAuto.map((tx) => ({ type: 'put', key: tx.id, value: tx })));
  await writeFile('txs_auto.json', JSON.stringify(txsAuto, null, 2));
  await writeFile('txs_manual.json', JSON.stringify(txsManual, null, 2));
} catch (error) {
  console.error(error);
}
