/* eslint-disable guard-for-in */
import { create } from '@waves/node-api-js';
import { data } from '@waves/waves-transactions';
import { writeFile } from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import prompts from 'prompts';
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
  stakingPublicKey,
  chainId,
} = config[network];

const separator = '__';
const largeNumbeConvertHeader = { headers: { Accept: 'application/json;large-significand-format=string' } };

const stakingAddress = address({ publicKey: stakingPublicKey }, chainId);

const nodeApi = create(nodeUrl);

const keyStakedTotalRegExp = /%s%s%s__staked__total__[a-zA-Z0-9]+$/;

const getActiveUsers = async () => {
  const users = await nodeApi.addresses.data(
    stakingAddress,
    { matches: encodeURIComponent('%s%s%s__staked__.+') },
    largeNumbeConvertHeader,
  );
  const activeUsers = users
    .filter(({ key, value }) => !keyStakedTotalRegExp.test(key) && value > 0)
    .reduce((acc, { key }) => {
      const [,, userAddress, lpAssetId] = key.split(separator);
      return {
        ...acc,
        [lpAssetId]: [...(lpAssetId in acc ? [...acc[lpAssetId]] : []), userAddress],
      };
    }, {});

  return activeUsers;
};

const getUsersListName = (lpAssetId) => ['users', lpAssetId].join(separator);
const keyListHead = (listName) => ['%s%s%s', listName, 'head'].join(separator);
const entryListHead = (listName, value) => ({ key: keyListHead(listName), type: 'string', value });
const keyListSize = (listName) => ['%s%s%s', listName, 'size'].join(separator);
const entryListSize = (listName, value) => ({ key: keyListSize(listName), type: 'integer', value });
const keyListPrev = (listName, id) => ['%s%s%s%s', listName, id, 'prev'].join(separator);
const entryListPrev = (listName, id, value) => ({ key: keyListPrev(listName, id), type: 'string', value });
const keyListNext = (listName, id) => ['%s%s%s%s', listName, id, 'next'].join(separator);
const entryListNext = (listName, id, value) => ({ key: keyListNext(listName, id), type: 'string', value });

const getDoublyLinkedListTxs = async () => {
  const activeUsers = await getActiveUsers();
  console.log('loaded');
  const actions = [];
  const headWritten = new Set();
  for (const lpAssetId in activeUsers) {
    const listName = getUsersListName(lpAssetId);
    const listSize = activeUsers[lpAssetId].length;
    actions.push(entryListSize(listName, listSize));
    for (const i in activeUsers[lpAssetId]) {
      if (headWritten.has(lpAssetId)) {
        actions.push(
          entryListNext(listName, activeUsers[lpAssetId][i - 1], activeUsers[lpAssetId][i]),
          entryListPrev(listName, activeUsers[lpAssetId][i], activeUsers[lpAssetId][i - 1]),
        );
      } else {
        actions.push(entryListHead(listName, activeUsers[lpAssetId][i]));
        headWritten.add(lpAssetId);
      }
    }
  }

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
    senderPublicKey: stakingPublicKey,
    additionalFee: 4e5,
  }));
};

try {
  // create transactions
  const txs = [
    ...await getDoublyLinkedListTxs(),
  ];

  // save txs
  await db.clear();
  await db.batch(txs.map((tx) => ({ type: 'put', key: tx.id, value: tx })));
  // save txs to file
  const { save } = await prompts({
    type: 'toggle',
    name: 'save',
    message: 'Save txs to file?',
    initial: false,
    active: 'yes',
    inactive: 'no',
  });
  if (save) {
    await writeFile('txs.json', JSON.stringify(txs, null, 2));
    console.log(txs.length);
  }
} catch (error) {
  console.error(error);
}
