import wc from '@waves/ts-lib-crypto';
import {
  massTransfer,
  issue,
} from '@waves/waves-transactions';
import { format } from 'path';
import { table, getBorderCharacters } from 'table';

import { readFile } from 'fs/promises';
import {
  chainId, broadcastAndWait, baseSeed,
} from '../../utils/api.mjs';

import {
  setScriptFromFile,
} from '../../utils/utils.mjs';

const nonceLength = 3;
const ridePath = '../ride';
const mockPath = './components/wxdao/mock';
const factoryPath = format({ dir: ridePath, base: 'wxdao_factory.ride' });
const calculatorPath = format({ dir: ridePath, base: 'wxdao_calculator.ride' });
const powerMockPath = format({ dir: mockPath, base: 'grid_trading_account.ride' });
const commonLibPath = format({ dir: ridePath, base: 'common.lib.ride' });

export const setup = async ({
  rewardAmount = 1000,
} = {}) => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex');
  const names = [
    'factory',
    'calculator',
    'power',
    'user1',
    'user2',
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
      name: 'WXDAO',
      description: '',
      quantity: 1e6 * 1e8,
      decimals: 8,
      reissuable: true,
      chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'POWER',
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
      powerMockPath,
      accounts.power.seed,
      null,
      libraries,
    ),
  ]);

  return {
    accounts, rewardAmount, assetId1, assetId2,
  };
};
