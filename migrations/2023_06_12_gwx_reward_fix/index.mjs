import { create } from '@waves/node-api-js';
import { data, invokeScript } from '@waves/waves-transactions';
import { join } from 'path';
import {
  writeFile, readdir, unlink,
} from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import inquirer from 'inquirer';
import ora from 'ora';
import config from './config.mjs';

const { network } = await inquirer.prompt([
  {
    type: 'list',
    name: 'network',
    message: 'Select network:',
    choices: [
      { name: 'testnet', value: 'testnet' },
      { name: 'mainnet', value: 'mainnet' },
    ],
    initial: 'testnet',
  }
])

const {
  nodeUrl,
  chainId,
  managerPublicKey,
  factoryPublicKey,
  emissionPublicKey,
  gwxRewardPublicKey,
  votingEmissionPublicKey,
  depositTxId,
} = config[network];

const factoryAddress = address({ publicKey: factoryPublicKey }, chainId);
const emissionAddress = address({ publicKey: emissionPublicKey }, chainId);
const gwxRewardAddress = address({ publicKey: gwxRewardPublicKey }, chainId);
const votingEmissionAddress = address({ publicKey: votingEmissionPublicKey }, chainId);

const nodeApi = create(nodeUrl);

const keyNextProcessedPeriod = () => `%s__nextProcessedPeriod`;
const keyNextPeriod = () => `%s__nextPeriod`;
const keyGwxHoldersRewardNext = () => `%s%s__gwxHoldersReward__next`;
const keyAuxEmissionRewardForPeriod = (period) => `%s%d__auxEmissionReward__${period}`;
const keyGwxRewardEmissionPartStartHeight = () => '%s%s__gwxRewardEmissionPart__startHeight'
const keyRatePerBlockCurrent = () => '%s%s__ratePerBlock__current'
const keyEpochLength = () => '%s__epochLength'

try {
  const txsPath = 'txs';

  // clear txs dir
  const spinner = ora('Cleanup').start();
  const exclude = ['.gitignore'];
  const files = await readdir(txsPath);
  await Promise.all(files.map(async (name) => {
    if (exclude.includes(name)) return name;
    return unlink(join(txsPath, name));
  }));

  spinner.text = 'Create transactions';

  // create transactions
  const txs = [];

  const nextProcessedPeriod = await nodeApi.addresses.fetchDataKey(gwxRewardAddress, keyNextProcessedPeriod()).then(({ value }) => value);
  const nextPeriod = await nodeApi.addresses.fetchDataKey(gwxRewardAddress, keyNextPeriod()).then(({ value }) => value);

  // gwx reward disable finalization
  txs.push([data({
    data: [
      { key: keyNextProcessedPeriod(), value: nextProcessedPeriod + 10 },
    ],
    additionalFee: 4e5,
    chainId,
    senderPublicKey: gwxRewardPublicKey,
  }), 'gwx_reward_disable_finalization']);

  // emission set current reward value
  const gwxHoldersReward = 0.2 * 10**8;
  txs.push([data({
    data: [
      { key: keyGwxHoldersRewardNext(), value: gwxHoldersReward },
    ],
    additionalFee: 4e5,
    chainId,
    senderPublicKey: emissionPublicKey,
  }), 'emission_set_next_reward_value']);

  // gwx reward deposit
  txs.push([invokeScript({
    dApp: gwxRewardAddress,
    call: {
      function: 'deposit',
      args: []
    },
    payment: [],
    chainId,
    senderPublicKey: managerPublicKey,
  }), 'gwx_reward_deposit']);

  // gwx reward fix aux amount, height
  const ratePerBlockCurrent = await nodeApi.addresses.fetchDataKey(emissionAddress, keyRatePerBlockCurrent()).then(({ value }) => value);
  const epochLength = await nodeApi.addresses.fetchDataKey(votingEmissionAddress, keyEpochLength()).then(({ value }) => value);
  const auxAmount = ratePerBlockCurrent * epochLength * gwxHoldersReward / 10**8;
  const gwxRewardEmissionPartStartHeight = await nodeApi.transactions.fetchInfo(depositTxId).then(({ height }) => height);
  txs.push([data({
    data: [
      { key: keyAuxEmissionRewardForPeriod(nextPeriod), value: auxAmount },
      { key: keyGwxRewardEmissionPartStartHeight(), value: gwxRewardEmissionPartStartHeight },
    ],
    additionalFee: 4e5,
    chainId,
    senderPublicKey: gwxRewardPublicKey,
  }), 'gwx_reward_fix_state']);

  // gwx reward enable finalization
  txs.push([data({
    data: [
      { key: keyNextProcessedPeriod(), value: nextProcessedPeriod },
    ],
    additionalFee: 4e5,
    chainId,
    senderPublicKey: gwxRewardPublicKey,
  }), 'gwx_reward_enable_finalization']);

  // gwx reward finalization test
  txs.push([invokeScript({
    dApp: gwxRewardAddress,
    call: {
      function: 'processPendingPeriodsAndUsers',
      args: []
    },
    payment: [],
    chainId,
    senderPublicKey: managerPublicKey,
  }), 'gwx_reward_finalization_test']);

  // save txs
  spinner.text = 'Saving transactions';
  await Promise.all(txs.map(async ([tx, name], idx) => {
    await writeFile(join(txsPath, `${idx}${name ? '_' : ''}${name || ''}.json`), JSON.stringify(tx, null, 2));
  }));
  spinner.succeed();
} catch (error) {
  console.error(error);
}
