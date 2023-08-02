import { create } from '@waves/node-api-js';
import { BigNumber } from '@waves/bignumber';
import {
  data,
  reissue,
  invokeScript,
  transfer,
} from '@waves/waves-transactions';
import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';
import { address } from '@waves/ts-lib-crypto';

dotenv.config();

const separator = '__';
const scriptedSenderFee = 4e5;

const {
  NODE_URL,
  CHAIN_ID,
  TXS_PATH,
  GWX_REWARD_PUBLIC_KEY,
  BOOSTING_PUBLIC_KEY,
  WX_ASSET_ID,
  MIN_LOCK_AMOUNT,
  MIN_LOCK_DURATION,
  MAX_LOCK_DURATION,
} = process.env;
const api = create(NODE_URL);

const boostingAddress = address(
  { publicKey: BOOSTING_PUBLIC_KEY },
  CHAIN_ID
);

const gwxRewardAddress = address(
  { publicKey: GWX_REWARD_PUBLIC_KEY },
  CHAIN_ID
);

const keyLockParamsRecordOld = (userAddress) =>
  `%s%s__lock__${userAddress}`;

const keyLockParamsRecord = (userAddress, txId) =>
  `%s%s__lock__${userAddress}__${txId}`;

const lockParamsRecord = ({
  amount,
  start,
  duration,
  timestamp,
  gwxAmount,
  wxClaimed,
}) => [
  '%d%d%d%d%d%d%d',
  amount.toString(),
  start.toString(),
  duration.toString(),
  timestamp.toString(),
  gwxAmount.toString(),
  wxClaimed.toString(),
].join(separator);

const lockParamsData = await api.addresses.data(boostingAddress, {
  matches: encodeURIComponent(
    `%s%s__lock__.+`
  ),
});

const actions = [];
let gwxAmountTotal = 0;
for (const { key, value } of lockParamsData) {
  const [
    /* meta */,
    /* 'lock' */,
    userAddress
  ] = key.split(separator);

  const [
    /* meta */,
    /* userNum */,
    amount,
    start,
    duration,
    /* paramK */,
    /* paramB */,
    timestamp, // last update timestamp
    gwxAmount
  ] = value.split(separator)

  if (amount <= 0) continue;

  gwxAmountTotal += parseInt(gwxAmount);
  actions.push({
    key: keyLockParamsRecord(userAddress, 'legacy'),
    type: 'string',
    value: lockParamsRecord({ amount, start, duration, timestamp, gwxAmount, wxClaimed: 0 }),
  });
}
const chunkSize = 100;
const actionsChunks = Array.from(
  { length: Math.ceil(actions.length / chunkSize) },
  () => []
);
for (const i in actions) {
  const chunkIndex = Math.floor(i / chunkSize);
  actionsChunks[chunkIndex].push(actions[i]);
}
const dataTxs = actionsChunks.map((changes) =>
  data({
    data: changes,
    chainId: CHAIN_ID,
    senderPublicKey: BOOSTING_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
  })
);

const txs = [];

// restart the script after boosting lock/unlock freeze?
txs.push({
  name: 'restart the script',
  tx: {},
});

txs.push({
  name: 'boosting data',
  tx: data({
    data: [
      {
        key: '%s%s__gwx__total',
        type: 'integer',
        value: gwxAmountTotal,
      },
      {
        key: '%s__config',
        type: 'string',
        value: [
          '%s%d%d%d%s',
          WX_ASSET_ID,
          MIN_LOCK_AMOUNT.toString(),
          MIN_LOCK_DURATION.toString(),
          MAX_LOCK_DURATION.toString(),
          gwxRewardAddress,
        ].join(separator),
      }
    ],
    senderPublicKey: BOOSTING_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

for (const tx of dataTxs) {
  const name = 'lock params';
  txs.push({ tx, name });
}

await fs.mkdir(TXS_PATH, { recursive: true });
const files = await fs.readdir(TXS_PATH);
await Promise.all(
  files.map(async (name) => {
    return fs.unlink(path.join(TXS_PATH, name));
  })
);
await Promise.all(
  txs.map(async ({ tx, name }, idx) => {
    await fs.writeFile(
      path.join(TXS_PATH, `${[idx, name.replace(/\s/g, '_')].join('_')}.json`),
      JSON.stringify(tx, null, 2)
    );
  })
);
