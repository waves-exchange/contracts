import wc from '@waves/ts-lib-crypto';
import {
  massTransfer,
  invokeScript,
  issue,
} from '@waves/waves-transactions';
import { format } from 'path';
import { table, getBorderCharacters } from 'table';

import {
  chainId, broadcastAndWait, baseSeed,
} from '../../utils/api.mjs';

import {
  compileScriptFromFile,
  setScriptFromFile,
} from '../../utils/utils.mjs';

const nonceLength = 3;
const ridePath = '../ride';
const factoryPath = format({ dir: ridePath, base: 'futures_factory.ride' });
const calculatorPath = format({ dir: ridePath, base: 'futures_calculator.ride' });
const accountPath = format({ dir: ridePath, base: 'futures_account.ride' });

export const setup = async ({
  rewardAmount = 1000,
} = {}) => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex');
  const names = [
    'factory',
    'calculator',
    'creator',
    'user1',
    'user2',
    'account1',
    'account2',
  ];
  const accounts = Object.fromEntries(names.map((item) => {
    const seed = `${item}#${nonce}`;
    return [item, { seed, address: wc.address(seed, chainId), publicKey: wc.publicKey(seed) }];
  }));
  const accountsInfo = Object.entries(accounts)
    .map(([name, { address, publicKey }]) => [name, address, publicKey]);
  console.log(table(accountsInfo, {
    border: getBorderCharacters('norc'),
    drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
    header: { content: `pid: ${process.pid}, nonce: ${nonce}` },
  }));
  const amount = 10e8;
  const massTransferTx = massTransfer({
    transfers: Object.values(accounts).map(({ address }) => ({ recipient: address, amount })),
    chainId,
  }, baseSeed);
  await broadcastAndWait(massTransferTx);

  const libraries = {};

  const [
    { id: assetId1 },
    { id: assetId2 },
  ] = await Promise.all([
    broadcastAndWait(issue({
      name: 'assetId1',
      description: '',
      quantity: 1e6 * 1e8,
      decimals: 8,
      reissuable: true,
      chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'assetId2',
      description: '',
      quantity: 1e6 * 1e8,
      decimals: 8,
      reissuable: true,
      chainId,
    }, baseSeed)),
    setScriptFromFile(
      factoryPath,
      accounts.factory.seed,
      null,
      libraries,
    ),
    setScriptFromFile(
      calculatorPath,
      accounts.calculator.seed,
      null,
      libraries,
    ),
  ]);

  const { base64: accountScript } = await compileScriptFromFile(accountPath, null, libraries);
  await broadcastAndWait(invokeScript({
    dApp: accounts.factory.address,
    call: {
      function: 'init',
      args: [
        { type: 'string', value: accounts.calculator.address },
        { type: 'binary', value: accountScript },
        { type: 'integer', value: rewardAmount },
      ],
    },
    chainId,
  }, accounts.factory.seed));

  await broadcastAndWait(invokeScript({
    dApp: accounts.calculator.address,
    call: {
      function: 'init',
      args: [
        { type: 'string', value: accounts.factory.address },
      ],
    },
    chainId,
  }, accounts.calculator.seed));

  return {
    accounts, rewardAmount, assetId1, assetId2,
  };
};
