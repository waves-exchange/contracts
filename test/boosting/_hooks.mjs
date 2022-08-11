import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
  data, invokeScript,
  issue,
  massTransfer,
  nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { setScriptFromFile } from '../utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
const mockRidePath = join('test', 'boosting', 'mock');
const boostingPath = format({ dir: ridePath, base: 'boosting.ride' });
const factoryV2Path = format({ dir: mockRidePath, base: 'factory_v2.ride' });
const mathContractPath = format({ dir: mockRidePath, base: 'math_contract.ride' });

export const mochaHooks = {
  async beforeAll() {
    console.log('test preparation');
    const names = [
      'boosting',
      'factoryV2',
      'referrer',
      'mathContract',
      'emission',
      'staking',
      'manager',
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
    await setScriptFromFile(boostingPath, this.accounts.boosting);
    await setScriptFromFile(factoryV2Path, this.accounts.factoryV2);
    await setScriptFromFile(mathContractPath, this.accounts.mathContract);

    console.log('hook execution');
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
    console.log('wxAssetId', this.wxAssetId);

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

    const factoryV2AddressStr = address(this.accounts.factoryV2, chainId);
    const lockAssetIdStr = this.wxAssetId;

    this.minLockAmount = 500000000;
    this.minDuration = 10;
    this.maxDuration = 2102400;
    const mathContract = address(this.accounts.mathContract, chainId);

    const constructorTx = invokeScript({
      dApp: address(this.accounts.boosting, chainId),
      additionalFee: 4e5,
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: factoryV2AddressStr },
          { type: 'string', value: lockAssetIdStr },
          { type: 'integer', value: this.minLockAmount },
          { type: 'integer', value: this.minDuration },
          { type: 'integer', value: this.maxDuration },
          { type: 'string', value: mathContract },
        ],
      },
      chainId,
    }, this.accounts.boosting);
    await api.transactions.broadcast(constructorTx, {});
    await waitForTx(constructorTx.id, { apiBase });

    const boostingConfig = `%s%d%d%d__${lockAssetIdStr}__${this.minLockAmount}__${this.minDuration}__${this.maxDuration}__${mathContract}`;
    const setConfigTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__config',
        type: 'string',
        value: boostingConfig,
      }],
      chainId,
    }, this.accounts.boosting);
    await api.transactions.broadcast(setConfigTx, {});
    await waitForTx(setConfigTx.id, { apiBase });

    const setManagerBoostingTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__managerPublicKey',
        type: 'string',
        value: publicKey(this.accounts.manager),
      }],
      chainId,
    }, this.accounts.boosting);
    await api.transactions.broadcast(setManagerBoostingTx, {});
    await waitForTx(setManagerBoostingTx.id, { apiBase });

    const setReferralsContractAddressTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s%s__config__referralsContractAddress',
        type: 'string',
        value: address(this.accounts.referrer, chainId),
      }],
      chainId,
    }, this.accounts.boosting);
    await api.transactions.broadcast(setReferralsContractAddressTx, {});
    await waitForTx(setReferralsContractAddressTx.id, { apiBase });

    const stakingContract = address(this.accounts.staking, chainId);
    const boostingContract = address(this.accounts.boosting, chainId);
    const idoContract = '';
    const teamContract = '';
    const emissionContract = address(this.accounts.emission, chainId);
    const restContract = '';
    const slpipageContract = '';
    const daoContract = '';
    const marketingContract = '';
    const gwxRewardsContract = mathContract;
    const birdsContract = '';

    const factoryV2Config = `%s%s%s%s%s%s%s%s%s%s%s__${stakingContract}__${boostingContract}__${idoContract}__${teamContract}__${emissionContract}__${restContract}__${slpipageContract}__${daoContract}__${marketingContract}__${gwxRewardsContract}__${birdsContract}`;

    const setFactoryV2ConfigTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__factoryConfig',
          type: 'string',
          value: factoryV2Config,
        },
      ],
      chainId,
    }, this.accounts.factoryV2);
    await api.transactions.broadcast(setFactoryV2ConfigTx, {});
    await waitForTx(setFactoryV2ConfigTx.id, { apiBase });

    const ratePerBlock = 3805175038;
    const setRatePerBlockTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s%s__ratePerBlock__current',
          type: 'integer',
          value: ratePerBlock,
        },
      ],
      chainId,
    }, this.accounts.emission);
    await api.transactions.broadcast(setRatePerBlockTx, {});
    await waitForTx(setRatePerBlockTx.id, { apiBase });

    const emissionStartBlock = 1806750;
    const setEmissionStartBlockTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s%s__emission__startBlock',
          type: 'integer',
          value: emissionStartBlock,
        },
      ],
      chainId,
    }, this.accounts.emission);
    await api.transactions.broadcast(setEmissionStartBlockTx, {});
    await waitForTx(setEmissionStartBlockTx.id, { apiBase });

    const emissionEndBlock = 4434750;
    const setEmissionEndBlockTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s%s__emission__endBlock',
          type: 'integer',
          value: emissionEndBlock,
        },
      ],
      chainId,
    }, this.accounts.emission);
    await api.transactions.broadcast(setEmissionEndBlockTx, {});
    await waitForTx(setEmissionEndBlockTx.id, { apiBase });
  },
};
