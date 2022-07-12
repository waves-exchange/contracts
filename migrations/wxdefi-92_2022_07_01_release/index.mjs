import { invokeScript, setScript } from '@waves/waves-transactions';
import { join } from 'path';
import ride from '@waves/ride-js';
import {
  readFile, writeFile, readdir, unlink,
} from 'fs/promises';
import { address } from '@waves/ts-lib-crypto';
import prompts from 'prompts';
import ora from 'ora';
import config from './config.mjs';

const { network } = await prompts({
  type: 'select',
  name: 'network',
  message: 'Network',
  choices: [
    { title: 'testnet', value: 'testnet' },
    { title: 'mainnet', value: 'mainnet' },
  ],
  initial: 0,
});

const {
  chainId,
  managerPublicKey,
  assetsStorePublicKey,
  userPoolsPublicKey,
  factoryPublicKey,
  votingEmissionPublicKey,
  votingEmissionCandidatePublicKey,
  stakingPublicKey,
  boostingPublicKey,
  emissionPublicKey,
  migratorPublicKey,
  wxAssetId,
  usdnAssetId,
} = config[network];

const factoryAddress = address({ publicKey: factoryPublicKey }, chainId);
const assetsStoreAddress = address({ publicKey: assetsStorePublicKey }, chainId);
const userPoolsAddress = address({ publicKey: userPoolsPublicKey }, chainId);
const votingEmissionAddress = address({ publicKey: votingEmissionPublicKey }, chainId);
const votingEmissionCandidateAddress = address({
  publicKey: votingEmissionCandidatePublicKey,
}, chainId);
const stakingAddress = address({ publicKey: stakingPublicKey }, chainId);
const boostingAddress = address({ publicKey: boostingPublicKey }, chainId);
const emissionAddress = address({ publicKey: emissionPublicKey }, chainId);
const migratorAddress = address({ publicKey: migratorPublicKey }, chainId);

try {
  const txsPath = 'txs';
  // clear txs dir
  const { clear } = await prompts({
    type: 'toggle',
    name: 'clear',
    message: 'Clear txs dir?',
    initial: true,
    active: 'yes',
    inactive: 'no',
  });
  if (clear) {
    const spinner = ora('Cleanup').start();
    const exclude = ['.gitignore'];
    const files = await readdir(txsPath);
    await Promise.all(files.map(async (name) => {
      if (exclude.includes(name)) return name;
      return unlink(join(txsPath, name));
    }));
    spinner.succeed();
  }

  const txsCreationSpinner = ora('Create transactions').start();

  // create transactions
  const txs = [];
  const ridePath = '../../ride';

  // factory set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'factory_v2.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: factoryPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'factory_set_script']);

  // factory constructorV6
  txs.push([invokeScript({
    dApp: factoryAddress,
    call: {
      function: 'constructorV6',
      args: [
        { type: 'string', value: votingEmissionAddress },
        { type: 'list', value: [{ type: 'string', value: usdnAssetId }] },
      ],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'factory_constructor_v6']);

  // staking constructorV2
  txs.push([invokeScript({
    dApp: stakingAddress,
    call: {
      function: 'constructorV2',
      args: [
        { type: 'string', value: votingEmissionAddress },
      ],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'staking_constructor_v2']);

  // assets_store set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'assets_store.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: assetsStorePublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'assets_store_set_script']);

  // assets_store constructorV2
  txs.push([invokeScript({
    dApp: assetsStoreAddress,
    call: {
      function: 'constructorV2',
      args: [
        { type: 'string', value: factoryAddress },
      ],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'assets_store_constructor_v2']);

  // voting_emission set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'voting_emission.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: votingEmissionPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'voting_emission_set_script']);

  // voting emission set manager
  txs.push([invokeScript({
    dApp: votingEmissionAddress,
    call: {
      function: 'setManager',
      args: [
        { type: 'string', value: managerPublicKey },
      ],
    },
    senderPublicKey: votingEmissionPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'voting_emission_set_manager']);

  // voting emission confirm manager
  txs.push([invokeScript({
    dApp: votingEmissionAddress,
    call: {
      function: 'confirmManager',
      args: [],
    },
    senderPublicKey: managerPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'voting_emission_confirm_manager']);

  // voting emission constructor with migrator
  const epochLength = 129600;
  txs.push([invokeScript({
    dApp: votingEmissionAddress,
    call: {
      function: 'constructor',
      args: [
        { type: 'string', value: factoryAddress },
        { type: 'string', value: migratorAddress },
        { type: 'string', value: boostingAddress },
        { type: 'string', value: stakingAddress },
        { type: 'integer', value: epochLength },
      ],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'voting_emission_constructor_migrator']);

  txs.push([{ path: 'migrations/wxdefi-92_2022_06_09_voting_emission', comment: 'use js-broadcaster' }, 'voting_emission_migration']);

  // voting emission constructor with voting emission candidate
  txs.push([invokeScript({
    dApp: votingEmissionAddress,
    call: {
      function: 'constructor',
      args: [
        { type: 'string', value: factoryAddress },
        { type: 'string', value: votingEmissionCandidateAddress },
        { type: 'string', value: boostingAddress },
        { type: 'string', value: stakingAddress },
        { type: 'integer', value: epochLength },
      ],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'voting_emission_constructor']);

  txs.push([{ path: 'migrations/wxdefi-92_2022_06_09_voting_emission', comment: 'use txs_manual.json file' }, 'wx_emission_labels']);

  // voting_emission_candidate set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'voting_emission_candidate.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: votingEmissionCandidatePublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'voting_emission_candidate_set_script']);

  // voting_emission_candidate set manager
  txs.push([invokeScript({
    dApp: votingEmissionCandidateAddress,
    call: {
      function: 'setManager',
      args: [
        { type: 'string', value: managerPublicKey },
      ],
    },
    senderPublicKey: votingEmissionCandidatePublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'voting_emission_candidate_set_manager']);

  // voting_emission_candidate confirm manager
  txs.push([invokeScript({
    dApp: votingEmissionCandidateAddress,
    call: {
      function: 'confirmManager',
      args: [],
    },
    senderPublicKey: managerPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'voting_emission_candidate_confirm_manager']);

  // voting_emission_candidate constructor
  const feeAmount = 1e9;
  const votingDuration = 20160;
  const finalizeReward = 0;
  txs.push([invokeScript({
    dApp: votingEmissionAddress,
    call: {
      function: 'constructor',
      args: [
        { type: 'string', value: assetsStoreAddress },
        { type: 'string', value: boostingAddress },
        { type: 'string', value: emissionAddress },
        { type: 'string', value: factoryAddress },
        { type: 'string', value: userPoolsAddress },
        { type: 'string', value: votingEmissionAddress },
        { type: 'integer', value: feeAmount },
        { type: 'string', value: wxAssetId },
        { type: 'integer', value: votingDuration },
        { type: 'string', value: usdnAssetId },
        { type: 'integer', value: finalizeReward },
      ],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'voting_emission_candidate_constructor']);

  txsCreationSpinner.succeed();

  const txsSavingSpinner = ora('Saving transactions').start();
  // save txs
  await Promise.all(txs.map(async ([tx, name], idx) => {
    await writeFile(join(txsPath, `${idx}${name ? '_' : ''}${name || ''}.json`), JSON.stringify(tx, null, 2));
  }));
  txsSavingSpinner.succeed();
} catch (error) {
  console.error(error);
}
