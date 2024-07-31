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
const multisigPath = format({ dir: ridePath, base: 'multisig.ride' });

export const setup = async ({
  rewardAmount = 1000,
} = {}) => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex');
  const names = [
    'factory',
    'calculator',
    'matcher',
    'creator',
    'multisig',
    'user1',
    'user2',
    'account1',
    'account2',
    'admin1',
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
    { id: assetId3 },
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
    broadcastAndWait(issue({
      name: 'assetId3',
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
    setScriptFromFile(
      multisigPath,
      accounts.multisig.seed,
      null,
      libraries,
    ),
  ]);

  const compact = true;
  const {
    base64: accountScript,
  } = await compileScriptFromFile(accountPath, null, libraries, compact);
  await broadcastAndWait(invokeScript({
    dApp: accounts.factory.address,
    call: {
      function: 'init',
      args: [
        { type: 'string', value: accounts.calculator.address },
        { type: 'string', value: accounts.matcher.publicKey },
        { type: 'binary', value: accountScript },
        { type: 'integer', value: rewardAmount },
      ],
    },
    additionalFee: 4e5,
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
    additionalFee: 4e5,
    chainId,
  }, accounts.calculator.seed));

  return {
    accounts, rewardAmount, assetId1, assetId2, assetId3,
  };
};
