import wc from '@waves/ts-lib-crypto';
import {
  massTransfer,
} from '@waves/waves-transactions';
import { format } from 'path';
import { table, getBorderCharacters } from 'table';

import {
  chainId, broadcastAndWait, baseSeed,
} from '../../utils/api.mjs';

import {
  setScriptFromFile,
} from '../../utils/utils.mjs';

const nonceLength = 3;
const ridePath = '../ride';
const multisigPath = format({ dir: ridePath, base: 'multisig.ride' });

export const setup = async () => {
  const nonce = wc.random(nonceLength, 'Buffer').toString('hex');
  const names = [
    'multisig',
    'admin0',
    'admin1',
    'admin2',
    'admin3',
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

  await Promise.all([
    setScriptFromFile(
      multisigPath,
      accounts.multisig.seed,
      null,
      libraries,
    ),
  ]);

  return {
    accounts,
  };
};
