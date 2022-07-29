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
const mockRidePath = 'test/referral/mock';
const referralPath = format({ dir: ridePath, base: 'referral.ride' });
const treasuryPath = format({ dir: mockRidePath, base: 'treasury.mock.ride' });

export const mochaHooks = {
  async beforeAll() {
    const names = [
      'referral',
      'implementation',
      'manager',
      'backend',
      'referrerAccount',
      'referralAccount',
      'treasury',
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

    const wxAmount = 1e16;
    const massTransferTxWX = massTransfer({
      transfers: names.slice(-1).map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
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

    const setTreasuryContractTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s%s__treasuryContract',
          type: 'string',
          value: this.accounts.treasury,
        },
      ],
      chainId,
    }, this.accounts.referral);
    await api.transactions.broadcast(setTreasuryContractTx, {});
    await waitForTx(setTreasuryContractTx.id, { apiBase });

    const setWxAssetIdReferralTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s%s__rewardAssetId',
          type: 'string',
          value: this.wxAssetId,
        },
      ],
      chainId,
    }, this.accounts.referral);
    await api.transactions.broadcast(setWxAssetIdReferralTx, {});
    await waitForTx(setWxAssetIdReferralTx.id, { apiBase });

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

    const setWxAssetIdTreasuryTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__wxAssetId',
          type: 'string',
          value: this.wxAssetId,
        },
      ],
      chainId,
    }, this.accounts.treasury);
    await api.transactions.broadcast(setWxAssetIdTreasuryTx, {});
    await waitForTx(setWxAssetIdTreasuryTx.id, { apiBase });
  },
};
