import { address, publicKey, random } from '@waves/ts-lib-crypto';
import { massTransfer, nodeInteraction, issue } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { table, getBorderCharacters } from 'table';

const { waitForTx } = nodeInteraction;
const { API_NODE_URL: apiBase, CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env;
const api = create(apiBase);
const nonceLength = 3;

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    this.votingDuration = 3;
    // setup accounts
    const contractNames = ['dapp', 'matcher', 'user'];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
    this.accounts = Object.fromEntries(names.map((item) => {
      const seed = `${item}#${nonce}`;
      return [item, { seed, addr: address(seed, chainId), publicKey: publicKey(seed) }];
    }));
    const amount = 1e10;
    const massTransferTx = massTransfer({
      transfers: Object.values(this.accounts)
        .map(({ addr: recipient }) => ({ recipient, amount })),
      chainId,
    }, baseSeed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });

    const issueTx = issue({
      name: 'token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, this.accounts.dapp.seed);
    await api.transactions.broadcast(issueTx, {});
    await waitForTx(issueTx.id, { apiBase });
    this.assetId = issueTx.id;

    const accountsInfo = Object.entries(this.accounts)
      .map(([name, { seed, addr }]) => [name, seed, addr]);
    console.log(table(accountsInfo, {
      border: getBorderCharacters('norc'),
      drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
      header: { content: `pid = ${process.pid}, nonce = ${nonce}` },
    }));
  },
};
