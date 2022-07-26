import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
// const mockRidePath = 'test/referall/mock';
const referralPath = format({ dir: ridePath, base: 'referral.ride' });

export const mochaHooks = {
  async beforeAll() {
    console.log('test preparation');
    const names = [
      'referral',
      'implementation',
      'marketing',
      'treasury',
      'manager',
      'backend',
      'referrerAccount',
      'referralAccount',
      'user1',
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

    console.log('account addresses:');
    for (const [key, value] of Object.entries(this.accounts)) {
      console.log('  ', key, address(value, chainId));
    }

    console.log('setScriptFromFile');
    await setScriptFromFile(referralPath, this.accounts.referral);

    console.log('hook execution');
    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(wxIssueTx, {});
    await waitForTx(wxIssueTx.id, { apiBase });
    this.wxAssetId = wxIssueTx.id;

    console.log('wxAssetId', this.wxAssetId);

    const wxAmount = 1e12;
    const massTransferTxWX = massTransfer({
      transfers: names.slice(-1).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.usdnAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });

    this.backendPublicKey = publicKey(this.accounts.backend);
    const setBackendPublicKeyTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__backendPublicKey',
          type: 'string',
          value: this.backendPublicKey,
        },
      ],
      chainId,
    }, this.accounts.referral);

    await api.transactions.broadcast(setBackendPublicKeyTx, {});
    await waitForTx(setBackendPublicKeyTx.id, { apiBase });

    const setManagerReferralTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager),
      }],
      chainId,
    }, this.accounts.referral);
    await api.transactions.broadcast(setManagerReferralTx, {});
    await waitForTx(setManagerReferralTx.id, { apiBase });
  },
};
