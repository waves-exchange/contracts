import { invokeScript, setScript, data } from '@waves/waves-transactions';
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
  managerPublicKey,
  boostingPublicKey,
  gwxRewardPublicKey,
  referralPublicKey,
  marketingPublicKey,
  backendSignerPublicKey,
  chainId,
  wxAssetId,
} = config[network];

const referralAddress = address({ publicKey: referralPublicKey }, chainId);
const marketingAddress = address({ publicKey: marketingPublicKey }, chainId);
const gwxRewardAddress = address({ publicKey: gwxRewardPublicKey }, chainId);

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

  // referral set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'referral.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: referralPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'referral_set_script']);

  // referral set manager
  txs.push([invokeScript({
    dApp: referralAddress,
    call: {
      function: 'setManager',
      args: [
        { type: 'string', value: managerPublicKey },
      ],
    },
    senderPublicKey: referralPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'referral_set_manager']);

  // referral confirm manager
  txs.push([invokeScript({
    dApp: referralAddress,
    call: {
      function: 'confirmManager',
      args: [],
    },
    senderPublicKey: managerPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'referral_confirm_manager']);

  // referral set backend signer
  txs.push([data({
    data: [
      { key: '%s__backendPublicKey', type: 'string', value: backendSignerPublicKey },
    ],
    senderPublicKey: referralPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'referral_set_backend_signer']);

  // referral create referral program
  const programName = 'wxlock';
  txs.push([invokeScript({
    dApp: referralAddress,
    call: {
      function: 'createReferralProgram',
      args: [
        { type: 'string', value: programName }, // programName
        { type: 'string', value: marketingAddress }, // treasuryContract
        { type: 'string', value: gwxRewardAddress }, // implementationContract
        { type: 'string', value: wxAssetId }, // rewardAssetId
      ],
    },
    senderPublicKey: managerPublicKey,
    chainId,
  }), 'referral_create_program']);

  // marketing set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'marketing.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: marketingPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'marketing_set_script']);

  // marketing set manager
  txs.push([invokeScript({
    dApp: marketingAddress,
    call: {
      function: 'setManager',
      args: [
        { type: 'string', value: managerPublicKey },
      ],
    },
    senderPublicKey: marketingPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'marketing_set_manager']);

  // marketing confirm manager
  txs.push([invokeScript({
    dApp: marketingAddress,
    call: {
      function: 'confirmManager',
      args: [],
    },
    senderPublicKey: managerPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'marketing_confirm_manager']);

  // marketing set referral contract address and wxAssetId
  txs.push([data({
    data: [
      { key: '%s__referral', type: 'string', value: referralAddress },
      { key: '%s__wxAssetId', type: 'string', value: wxAssetId },
    ],
    senderPublicKey: marketingPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'marketing_set_referral_and_wx_asset_id']);

  // gwx_reward set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'gwx_reward.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: gwxRewardPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'gwx_reward_set_script']);

  // gwx_reward set referral conract address and params
  const minGWxAmount = 500 * 1e8;
  const referrerRewardPermille = 50;
  const referralRewardPermille = 50;
  txs.push([data({
    data: [
      { key: '%s%s__config__referralsContractAddress', type: 'string', value: referralAddress },
      { key: '%s%s__referral__minGWxAmount', type: 'integer', value: minGWxAmount },
      { key: '%s%s__referral__referrerRewardPermille', type: 'integer', value: referrerRewardPermille },
      { key: '%s%s__referral__referralRewardPermille', type: 'integer', value: referralRewardPermille },
    ],
    senderPublicKey: gwxRewardPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'gwx_reward_set_referral_and_params']);

  // boosting set script
  txs.push([setScript({
    script: ride.compile(await readFile(join(ridePath, 'boosting.ride'), { encoding: 'utf-8' })).result.base64,
    senderPublicKey: boostingPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'boosting_set_script']);

  // boosting set referral conract address
  txs.push([data({
    data: [
      { key: '%s%s__config__referralsContractAddress', type: 'string', value: referralAddress },
    ],
    senderPublicKey: boostingPublicKey,
    additionalFee: 4e5,
    chainId,
  }), 'boosting_set_referral']);

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
