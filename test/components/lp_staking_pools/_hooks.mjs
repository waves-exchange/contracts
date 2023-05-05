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
const mockPath = './components/lp_staking_pools/mock';
const lpStakingPoolsPath = format({ dir: ridePath, base: 'lp_staking_pools.ride' });
const factoryMockPath = format({ dir: mockPath, base: 'factory_v2.ride' });
const assetsStoreMockPath = format({ dir: mockPath, base: 'assets_store.ride' });
const stakingMockPath = format({ dir: mockPath, base: 'staking.ride' });
const lpStableMockPath = format({ dir: mockPath, base: 'lp_stable.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    // setup accounts
    const contractNames = [
      'lpStakingPools',
      'lpStable',
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

    const lpAssetIssueTx = issue({
      name: 'USDTUSDNLP',
      description: '',
      quantity: 1e10 * 1e8,
      decimals: 8,
      chainId,
    }, this.accounts.factory.seed);
    await broadcastAndWait(lpAssetIssueTx);
    this.lpAssetId = lpAssetIssueTx.id;

    await setScriptFromFile(lpStakingPoolsPath, this.accounts.lpStakingPools.seed);
    await setScriptFromFile(factoryMockPath, this.accounts.factory.seed);
    await setScriptFromFile(assetsStoreMockPath, this.accounts.assetsStore.seed);
    await setScriptFromFile(stakingMockPath, this.accounts.staking.seed);
    await setScriptFromFile(lpStableMockPath, this.accounts.lpStable.seed);

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
        { key: '%s__usdtAssetId', type: 'string', value: this.usdtAssetId },
      ],
      additionalFee: 4e5,
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
