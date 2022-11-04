import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data,
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
const mockRidePath = join('components', 'referral', 'mock');
const referralPath = format({ dir: ridePath, base: 'referral.ride' });
const treasuryPath = format({ dir: mockRidePath, base: 'treasury.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'referral',
      'manager',
      'backend',
      'referrerAccount',
      'referralAccount',
      'implementation',
      'implementationSecond',
      'treasury',
      'treasurySecond',
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

    await setScriptFromFile(referralPath, this.accounts.referral);
    await setScriptFromFile(treasuryPath, this.accounts.treasury);
    await setScriptFromFile(treasuryPath, this.accounts.treasurySecond);

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
      transfers: names.slice(names.length - 4).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
      chainId,
    }, seed);
    await api.transactions.broadcast(massTransferTxWX, {});
    await waitForTx(massTransferTxWX.id, { apiBase });

    const setWxAssetIdOnTreasuryTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__wxAssetId',
        type: 'string',
        value: this.wxAssetId,
      }],
      chainId,
    }, this.accounts.treasury);
    await api.transactions.broadcast(setWxAssetIdOnTreasuryTx, {});
    await waitForTx(setWxAssetIdOnTreasuryTx.id, { apiBase });

    const setWxAssetIdOnTreasurySecondTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__wxAssetId',
        type: 'string',
        value: this.wxAssetId,
      }],
      chainId,
    }, this.accounts.treasurySecond);
    await api.transactions.broadcast(setWxAssetIdOnTreasurySecondTx, {});
    await waitForTx(setWxAssetIdOnTreasurySecondTx.id, { apiBase });

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
