import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data, invokeScript,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = '../ride';


const mockRidePath = join('components', 'proposal', 'mock');
const proposalPath = format({ dir: ridePath, base: 'proposal.ride' });
const boostingMockPath = format({ dir: testPath, base: 'boosting.mock.ride' });



export const mochaHooks = {
  async beforeAll() {
    const names = [
      'proposal',
      'boosting',
      'user1',
      'user2',
      'user3',
    ];
    this.accounts = Object.fromEntries(names.map((item) => [item, randomSeed(seedWordsCount)]));
    const seeds = Object.values(this.accounts);
    const amount = 1e10;
    const massTransferTx = massTransfer({
      transfers: seeds.map((item) => ({ recipient: address(item, chainId), amount })),
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTx, {});
    await waitForTx(massTransferTx.id, { apiBase });

    await setScriptFromFile(proposalPath, this.accounts.proposal);


    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 10e16,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(wxIssueTx, {});
    await waitForTx(wxIssueTx.id, { apiBase });
    this.wxAssetId = wxIssueTx.id;

    const wxAmount = 1e16;
    const massTransferTxWX = massTransfer({
      transfers: names.slice(names.length - 2).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });

    const boostingAddressStr = address(this.accounts.boosting, chainId);

    // this.minLockAmount = 500000000;
    // this.minDuration = 2;
    // this.maxDuration = 2102400;
    
  },
};
