import wc from '@waves/ts-lib-crypto';
import {
  massTransfer,
  issue,
  invokeScript,
  data,
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
const powerMockPath = format({ dir: mockPath, base: 'pwr.ride' });
const commonLibPath = format({ dir: ridePath, base: 'common.lib.ride' });

export const setup = async ({
  periodLength = 10800,
  treasuryValue = 0,
} = {}) => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex');
  const names = [
    'factory',
    'calculator',
    'treasury',
    'power',
    'poolsFactory',
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
    { id: wxdaoAssetId },
    { id: pwrAssetId },
    { id: wxAssetId },
    { id: usdtwxgAssetId },
    { id: usdcwxgAssetId },
    { id: ltcwxgAssetId },
    { id: ethwxgAssetId },
    { id: btcwxgAssetId },
  ] = await Promise.all([
    broadcastAndWait(issue({
      name: 'WXDAO', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
    }, accounts.factory.seed)),
    broadcastAndWait(issue({
      name: 'POWER', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'WX Token', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'USDT-WXG', description: '', quantity: 1e6 * 1e8, decimals: 6, reissuable: true, chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'USDC-WXG', description: '', quantity: 1e6 * 1e8, decimals: 6, reissuable: true, chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'LTC-WXG', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'ETH-WXG', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
    }, baseSeed)),
    broadcastAndWait(issue({
      name: 'BTC-WXG', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
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

  const assets = {
    wxAssetId,
    usdtwxgAssetId,
    usdcwxgAssetId,
    ltcwxgAssetId,
    ethwxgAssetId,
    btcwxgAssetId,
  };
  await broadcastAndWait(invokeScript({
    dApp: accounts.factory.address,
    call: {
      function: 'init',
      args: [
        { type: 'string', value: wxdaoAssetId },
        { type: 'string', value: accounts.treasury.address },
        { type: 'string', value: accounts.calculator.address },
        { type: 'string', value: accounts.power.address },
        { type: 'string', value: accounts.poolsFactory.address },
        { type: 'integer', value: periodLength },
        { type: 'integer', value: treasuryValue },
        { type: 'list', value: Object.values(assets).map((value) => ({ type: 'string', value })) },
      ],
    },
    chainId,
    additionalFee: 4e5,
  }, accounts.factory.seed));

  await broadcastAndWait(data({
    data: [
      { key: 'powerAssetId', type: 'string', value: pwrAssetId },
      { key: 'contract_children', type: 'string', value: accounts.power.address },
    ],
    chainId,
    additionalFee: 4e5,
  }, accounts.power.seed));

  return {
    accounts,
    wxdaoAssetId,
    pwrAssetId,
    periodLength,
    treasuryValue,
    assets,
  };
};
