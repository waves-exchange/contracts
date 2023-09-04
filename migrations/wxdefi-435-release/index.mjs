import { create } from '@waves/node-api-js';
import { data } from '@waves/waves-transactions';
import fs from 'fs/promises';
import path from 'path';
import { address } from '@waves/ts-lib-crypto';

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
  BLOCKS_IN_PERIOD,
  LOCK_STEP_BLOCKS,
  UNLOCK_START_HEIGHT,
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

const keyLockParamsRecord = (userAddress, txId) =>
  `%s%s%s__lock__${userAddress}__${txId}`;

const keyUserGwxAmountTotal = (userAddress) =>
  `%s%s__gwxAmountTotal__${userAddress}`;

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
    `%s%s__lock__[^_]+`
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
    lockAmount,
    lockStart,
    lockDuration,
    /* paramK */,
    /* paramB */,
    lockTimestamp, // last update timestamp
    /* gwxAmount */
  ] = value.split(separator)

  if (lockAmount <= 0) continue;
  const lockEnd = lockStart + lockDuration;
  let gwxAmount = 0, duration = lockDuration, start = lockStart;
  if (lockEnd > UNLOCK_START_HEIGHT) {
    start = UNLOCK_START_HEIGHT;
    duration = lockEnd - start;
    gwxAmount = Math.floor((lockAmount * duration) / MAX_LOCK_DURATION);
  }

  gwxAmountTotal += parseInt(gwxAmount);
  actions.push(
    {
      key: keyLockParamsRecord(userAddress, 'legacy'),
      type: 'string',
      value: lockParamsRecord({
        amount: lockAmount,
        start,
        duration,
        timestamp: lockTimestamp,
        gwxAmount,
        wxClaimed: 0,
      }),
    },
    {
      key: keyUserGwxAmountTotal(userAddress),
      type: 'integer',
      value: parseInt(gwxAmount),
    },
  );
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
          '%s%d%d%d%s%d',
          WX_ASSET_ID,
          MIN_LOCK_AMOUNT.toString(),
          MIN_LOCK_DURATION.toString(),
          MAX_LOCK_DURATION.toString(),
          gwxRewardAddress,
          BLOCKS_IN_PERIOD.toString(),
          LOCK_STEP_BLOCKS.toString(),
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
console.log(`Done. ${txs.length} txs created.`)
