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
  FACTORY_PUBLIC_KEY,
  PROFIT_INCREASE,
  STEP_SIZE,
  ORDERS_NUMBER,
} = process.env;

const api = create(NODE_URL);

const factoryAddress = address(
  { publicKey: FACTORY_PUBLIC_KEY },
  CHAIN_ID
);

const keyPoolProfitIncrease = (poolAddress) => '%s%s__profitIncrease__' + poolAddress
const keyPoolStepSize = (poolAddress) => '%s%s__stepSize__' + poolAddress
const keyPoolOrdersNumber = (poolAddress) => '%s%s__ordersNumber__' + poolAddress

const actions = await api.addresses.data(factoryAddress, {
  matches: encodeURIComponent(
    '%s%s%s__.+__mappings__poolContract2PoolAssets'
  ),
}).then((res) => res.reduce((acc, { key }) => {
  const poolAddress = key.split(separator)[1];
  return [
    ...acc,
    {
      key: keyPoolProfitIncrease(poolAddress),
      type: 'integer',
      value: PROFIT_INCREASE,
    },
    {
      key: keyPoolStepSize(poolAddress),
      type: 'integer',
      value: STEP_SIZE,
    },
    {
      key: keyPoolOrdersNumber(poolAddress),
      type: 'integer',
      value: ORDERS_NUMBER,
    },
  ]
}, []));

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
    senderPublicKey: FACTORY_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
  })
);

const txs = [];

for (const tx of dataTxs) {
  const name = 'data';
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
