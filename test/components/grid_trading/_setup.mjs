import wc, { base58Decode, base64Encode } from '@waves/ts-lib-crypto';
import {
  massTransfer,
  invokeScript,
  issue,
} from '@waves/waves-transactions';
import { format } from 'path';
import { table, getBorderCharacters } from 'table';

import { readFile } from 'fs/promises';
import {
  chainId, broadcastAndWait, baseSeed,
} from '../../utils/api.mjs';

import {
  compileScriptFromFile,
  setScriptFromFile,
} from '../../utils/utils.mjs';

const nonceLength = 3;
const ridePath = '../ride';
const factoryPath = format({ dir: ridePath, base: 'grid_trading_factory.ride' });
const servicePath = format({ dir: ridePath, base: 'grid_trading_service.ride' });
const accountPath = format({ dir: ridePath, base: 'grid_trading_account.ride' });
const commonLibPath = format({ dir: ridePath, base: 'common.lib.ride' });

export const setup = async ({
  rewardAmount = 1000,
} = {}) => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex');
  const names = [
    'factory',
    'service',
    'serviceNew',
    'bot',
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

  const libraries = {
    'common.lib.ride': await readFile(commonLibPath, { encoding: 'utf-8' }),
  };

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
      servicePath,
      accounts.service.seed,
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
        { type: 'binary', value: base64Encode(base58Decode(accounts.service.publicKey)) },
        { type: 'binary', value: base64Encode(base58Decode(accounts.bot.publicKey)) },
        { type: 'binary', value: accountScript },
        { type: 'integer', value: rewardAmount },
      ],
    },
    chainId,
  }, accounts.factory.seed));

  return {
    accounts, rewardAmount, assetId1, assetId2,
  };
};
