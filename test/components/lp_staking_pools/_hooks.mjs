import {
  address, privateKey, publicKey, random,
} from '@waves/ts-lib-crypto';
import {
  massTransfer, issue, data,
} from '@waves/waves-transactions';
import { table, getBorderCharacters } from 'table';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { broadcastAndWait } from '../../utils/api.mjs';

const { CHAIN_ID: chainId, BASE_SEED: baseSeed } = process.env;
const nonceLength = 3;

const ridePath = '../ride';
const lpStakingPoolsPath = format({ dir: ridePath, base: 'lp_staking_pools.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    // setup accounts
    const contractNames = [
      'lpStakingPools',
      'factory',
      'assetsStore',
      'lpStaking',
      'staking',
      'boosting',
      'factory',
      'swap',
      'user',
    ];
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
    await broadcastAndWait(massTransferTx);

    const usdnIssueTx = issue({
      name: 'USDN',
      description: '',
      quantity: 1e10 * 1e6,
      decimals: 6,
      chainId,
    }, baseSeed);
    await broadcastAndWait(usdnIssueTx);
    this.usdnAssetId = usdnIssueTx.id;

    const usdtIssueTx = issue({
      name: 'USDT',
      description: '',
      quantity: 1e10 * 1e6,
      decimals: 6,
      chainId,
    }, baseSeed);
    await broadcastAndWait(usdtIssueTx);
    this.usdtAssetId = usdtIssueTx.id;

    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 1e10 * 1e8,
      decimals: 8,
      chainId,
    }, baseSeed);
    await broadcastAndWait(wxIssueTx);
    this.wxAssetId = wxIssueTx.id;

    await setScriptFromFile(lpStakingPoolsPath, this.accounts.lpStakingPools.seed);

    const setRequiredStateTx = data({
      data: [
        { key: '%s__factoryContract', type: 'string', value: this.accounts.factory.addr },
        { key: '%s__assetsStoreContract', type: 'string', value: this.accounts.assetsStore.addr },
        { key: '%s__lpStakingContract', type: 'string', value: this.accounts.lpStaking.addr },
        { key: '%s__stakingContract', type: 'string', value: this.accounts.staking.addr },
        { key: '%s__boostingContract', type: 'string', value: this.accounts.boosting.addr },
        { key: '%s__swapContract', type: 'string', value: this.accounts.swap.addr },
        { key: '%s__usdnAssetId', type: 'string', value: this.usdnAssetId },
        { key: '%s__wxAssetId', type: 'string', value: this.wxAssetId },
      ],
      chainId,
    }, this.accounts.lpStakingPools.seed);
    await broadcastAndWait(setRequiredStateTx);

    const accountsInfo = Object.entries(this.accounts)
      .map(([name, { seed, addr }]) => [name, seed, privateKey(seed), addr]);
    console.log(table(accountsInfo, {
      border: getBorderCharacters('norc'),
      drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
      header: { content: `pid = ${process.pid}, nonce = ${nonce}` },
    }));
  },
};
