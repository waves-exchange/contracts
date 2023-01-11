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
  LP_STAKING_PUBLIC_KEY,
  LP_STAKING_POOLS_PUBLIC_KEY,
  USDC_ASSET_ID,
  USDT_ASSET_ID,
  TXS_PATH,
  ASSETS_STORE_PUBLIC_KEY,
  MANAGER_PUBLIC_KEY,
  FACTORY_PUBLIC_KEY,
  STAKING_PUBLIC_KEY,
  BOOSTING_PUBLIC_KEY,
  SWAP_PUBLIC_KEY,
  WX_ASSET_ID,
  USDN_ASSET_ID,
  USDC_USDN_POOL_PUBLIC_KEY,
  USDT_USDN_POOL_PUBLIC_KEY,
} = process.env;
const api = create(NODE_URL);

const lpStakingAddress = address(
  { publicKey: LP_STAKING_PUBLIC_KEY },
  CHAIN_ID
);
const lpStakingPoolsAddress = address(
  { publicKey: LP_STAKING_POOLS_PUBLIC_KEY },
  CHAIN_ID
);
const assetsStoreAddress = address(
  { publicKey: ASSETS_STORE_PUBLIC_KEY },
  CHAIN_ID
);

const keyMapBaseToInternal = (baseAsset) =>
  `%s%s%s__mappings__baseAsset2internalId__${baseAsset}`;
const { value: usdtInternalAssetId } = await api.addresses.fetchDataKey(
  lpStakingAddress,
  keyMapBaseToInternal(USDT_ASSET_ID)
);
const { value: usdcInternalAssetId } = await api.addresses.fetchDataKey(
  lpStakingAddress,
  keyMapBaseToInternal(USDC_ASSET_ID)
);
const operationsData = await api.addresses.data(lpStakingAddress, {
  matches: encodeURIComponent(
    `%s%d%s%s__G__(${usdtInternalAssetId}|${usdcInternalAssetId})__.+`
  ),
});
const internalToBaseAssetId = {
  [usdtInternalAssetId]: USDT_ASSET_ID,
  [usdcInternalAssetId]: USDC_ASSET_ID,
};
const requestsInfo = {
  [USDC_ASSET_ID]: { totalAmount: new BigNumber(0), users: {} },
  [USDT_ASSET_ID]: { totalAmount: new BigNumber(0), users: {} },
};
for (const { key, value } of operationsData) {
  const statusPending = 'PENDING';
  const internalBaseAssetId = key.split(separator)[2];
  const baseAssetId = internalToBaseAssetId[internalBaseAssetId];
  const userAddress = key.split(separator)[3];
  const status = value.split(separator)[1];
  const inAssetAmount = new BigNumber(value.split(separator)[2]);
  if (status != statusPending) continue;
  requestsInfo[baseAssetId]['users'][userAddress] = (
    requestsInfo[baseAssetId]['users'][userAddress] || new BigNumber(0)
  ).add(inAssetAmount);
  requestsInfo[baseAssetId]['totalAmount'] =
    requestsInfo[baseAssetId]['totalAmount'].add(inAssetAmount);
}

const keyShareAssetAmountToConvert = (baseAssetId) =>
  ['%s%s', baseAssetId, 'shareAssetAmountToConvert'].join(separator);
const keyUserShareAssetAmountToConvert = (baseAssetId, userAddress) =>
  ['%s%s%s', baseAssetId, userAddress, 'shareAssetAmountToConvert'].join(
    separator
  );
const keyAssetConfig = (baseAsset) =>
  ['%s%s%s', 'config', 'asset', baseAsset].join(separator);
const actions = [];
const reissues = [];
const shareAssetTransfers = [];
const shareAssets = {};
for (const baseAsset in requestsInfo) {
  const { value: baseAssetConfig } = await api.addresses.fetchDataKey(
    lpStakingAddress,
    keyAssetConfig(baseAsset)
  );
  const shareAssetId = baseAssetConfig.split(separator)[1];
  shareAssets[baseAsset] = shareAssetId;
  reissues.push(
    reissue({
      assetId: shareAssetId,
      quantity: requestsInfo[baseAsset]['totalAmount'].toNumber(),
      reissuable: true,
      senderPublicKey: LP_STAKING_PUBLIC_KEY,
      additionalFee: scriptedSenderFee,
      chainId: CHAIN_ID,
    })
  );
  shareAssetTransfers.push(
    transfer({
      assetId: shareAssetId,
      amount: requestsInfo[baseAsset]['totalAmount'].toNumber(),
      senderPublicKey: LP_STAKING_PUBLIC_KEY,
      recipient: lpStakingPoolsAddress,
      additionalFee: scriptedSenderFee,
      chainId: CHAIN_ID,
    })
  );
  actions.push({
    key: keyShareAssetAmountToConvert(baseAsset),
    type: 'integer',
    value: requestsInfo[baseAsset]['totalAmount'].toString(),
  });
  for (const userAddress in requestsInfo[baseAsset]['users']) {
    actions.push({
      key: keyUserShareAssetAmountToConvert(baseAsset, userAddress),
      type: 'integer',
      value: requestsInfo[baseAsset]['users'][userAddress].toString(),
    });
  }
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
    senderPublicKey: LP_STAKING_POOLS_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
  })
);

const txs = [];

txs.push({
  name: 'set manager',
  tx: invokeScript({
    dApp: lpStakingPoolsAddress,
    call: {
      function: 'setManager',
      args: [{ type: 'string', value: MANAGER_PUBLIC_KEY }],
    },
    senderPublicKey: LP_STAKING_POOLS_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'confirm manager',
  tx: invokeScript({
    dApp: lpStakingPoolsAddress,
    call: {
      function: 'confirmManager',
      args: [],
    },
    senderPublicKey: MANAGER_PUBLIC_KEY,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'lp staking pools data',
  tx: data({
    data: [
      {
        key: '%s__factoryContract',
        type: 'string',
        value: address({ publicKey: FACTORY_PUBLIC_KEY }, CHAIN_ID),
      },
      {
        key: '%s__assetsStoreContract',
        type: 'string',
        value: assetsStoreAddress,
      },
      {
        key: '%s__lpStakingContract',
        type: 'string',
        value: lpStakingAddress,
      },
      {
        key: '%s__stakingContract',
        type: 'string',
        value: address({ publicKey: STAKING_PUBLIC_KEY }, CHAIN_ID),
      },
      {
        key: '%s__boostingContract',
        type: 'string',
        value: address({ publicKey: BOOSTING_PUBLIC_KEY }, CHAIN_ID),
      },
      {
        key: '%s__swapContract',
        type: 'string',
        value: address({ publicKey: SWAP_PUBLIC_KEY }, CHAIN_ID),
      },
      {
        key: '%s__usdnAssetId',
        type: 'string',
        value: USDN_ASSET_ID,
      },
      {
        key: '%s__wxAssetId',
        type: 'string',
        value: WX_ASSET_ID,
      },
    ],
    senderPublicKey: LP_STAKING_POOLS_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'lp staking data',
  tx: data({
    data: [
      {
        key: '%s__lpStakingPoolsContract',
        type: 'string',
        value: lpStakingPoolsAddress,
      },
    ],
    senderPublicKey: LP_STAKING_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'boosting data',
  tx: data({
    data: [
      {
        key: '%s__lpStakingPoolsContract',
        type: 'string',
        value: lpStakingPoolsAddress,
      },
    ],
    senderPublicKey: BOOSTING_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'staking data',
  tx: data({
    data: [
      {
        key: '%s__lpStakingPoolsContract',
        type: 'string',
        value: lpStakingPoolsAddress,
      },
    ],
    senderPublicKey: STAKING_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

const keyAssetsStoreAdmins = '%s__adminPubKeys';
const { value: assetsStoreAdminsString } = await api.addresses.fetchDataKey(
  assetsStoreAddress,
  keyAssetsStoreAdmins
);
txs.push({
  name: 'assets store admins',
  tx: data({
    data: [
      {
        key: '%s__adminPubKeys',
        type: 'string',
        value: [
          ...assetsStoreAdminsString.split(separator),
          LP_STAKING_POOLS_PUBLIC_KEY,
        ].join(separator),
      },
    ],
    senderPublicKey: ASSETS_STORE_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

const keyShutdownPutOperation = (internalToBaseAssetId) =>
  ['%s%d', 'shutdown', internalToBaseAssetId].join(separator);
txs.push({
  name: 'lp staking shutdown',
  tx: data({
    data: [
      {
        key: keyShutdownPutOperation(usdcInternalAssetId),
        type: 'boolean',
        value: true,
      },
      {
        key: keyShutdownPutOperation(usdtInternalAssetId),
        type: 'boolean',
        value: true,
      },
    ],
    chainId: CHAIN_ID,
    senderPublicKey: LP_STAKING_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
  }),
});

txs.push({
  name: 'restart the script',
  tx: {
    comment: 'restart the script after lp staking shutdown to get right values',
  },
});

const { balance: usdcBalance } = await api.assets.fetchBalanceAddressAssetId(
  lpStakingAddress,
  USDC_ASSET_ID
);
txs.push({
  name: 'transfer usdc',
  tx: transfer({
    assetId: USDC_ASSET_ID,
    amount: usdcBalance,
    recipient: lpStakingPoolsAddress,
    additionalFee: scriptedSenderFee,
    senderPublicKey: LP_STAKING_PUBLIC_KEY,
    chainId: CHAIN_ID,
  }),
});
const { balance: usdtBalance } = await api.assets.fetchBalanceAddressAssetId(
  lpStakingAddress,
  USDT_ASSET_ID
);
txs.push({
  name: 'transfer usdt',
  tx: transfer({
    assetId: USDT_ASSET_ID,
    amount: usdtBalance,
    recipient: lpStakingPoolsAddress,
    additionalFee: scriptedSenderFee,
    senderPublicKey: LP_STAKING_PUBLIC_KEY,
    chainId: CHAIN_ID,
  }),
});

const minOutAmount = 0;
const autoStake = true;
txs.push({
  name: 'put usdc',
  tx: invokeScript({
    dApp: address({ publicKey: USDC_USDN_POOL_PUBLIC_KEY }, CHAIN_ID),
    call: {
      function: 'putOneTknV2',
      args: [
        { type: 'integer', value: minOutAmount },
        { type: 'boolean', value: autoStake },
      ],
    },
    payment: [{ assetId: USDC_ASSET_ID, amount: usdcBalance }],
    senderPublicKey: LP_STAKING_POOLS_PUBLIC_KEY,
    chainId: CHAIN_ID,
  }),
});
txs.push({
  name: 'put usdt',
  tx: invokeScript({
    dApp: address({ publicKey: USDT_USDN_POOL_PUBLIC_KEY }, CHAIN_ID),
    call: {
      function: 'putOneTknV2',
      args: [
        { type: 'integer', value: minOutAmount },
        { type: 'boolean', value: autoStake },
      ],
    },
    payment: [{ assetId: USDT_ASSET_ID, amount: usdtBalance }],
    senderPublicKey: LP_STAKING_POOLS_PUBLIC_KEY,
    chainId: CHAIN_ID,
  }),
});

for (const tx of reissues) {
  const name = 'reissue';
  txs.push({ tx, name });
}

for (const tx of shareAssetTransfers) {
  const name = 'transfer share assets';
  txs.push({ tx, name });
}

for (const tx of dataTxs) {
  const name = 'get requests';
  txs.push({ tx, name });
}

txs.push({
  name: 'create usdc',
  tx: invokeScript({
    dApp: lpStakingPoolsAddress,
    call: {
      function: 'create',
      args: [
        { type: 'string', value: USDC_ASSET_ID },
        { type: 'string', value: shareAssets[USDC_ASSET_ID] },
        { type: 'string', value: '' },
        { type: 'string', value: '' },
        { type: 'string', value: '' },
      ],
    },
    senderPublicKey: MANAGER_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'create usdt',
  tx: invokeScript({
    dApp: lpStakingPoolsAddress,
    call: {
      function: 'create',
      args: [
        { type: 'string', value: USDT_ASSET_ID },
        { type: 'string', value: shareAssets[USDT_ASSET_ID] },
        { type: 'string', value: '' },
        { type: 'string', value: '' },
        { type: 'string', value: '' },
      ],
    },
    senderPublicKey: MANAGER_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'finalize usdc',
  tx: invokeScript({
    dApp: lpStakingPoolsAddress,
    call: {
      function: 'finalize',
      args: [{ type: 'string', value: USDC_ASSET_ID }],
    },
    senderPublicKey: MANAGER_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

txs.push({
  name: 'finalize usdt',
  tx: invokeScript({
    dApp: lpStakingPoolsAddress,
    call: {
      function: 'finalize',
      args: [{ type: 'string', value: USDT_ASSET_ID }],
    },
    senderPublicKey: MANAGER_PUBLIC_KEY,
    additionalFee: scriptedSenderFee,
    chainId: CHAIN_ID,
  }),
});

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
