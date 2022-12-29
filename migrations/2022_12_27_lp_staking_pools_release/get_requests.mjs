import { create } from '@waves/node-api-js'
import { BigNumber } from '@waves/bignumber'
import { data, reissue, libs } from '@waves/waves-transactions'
import { writeFile } from 'fs/promises'
import * as dotenv from 'dotenv'

dotenv.config()

const separator = '__'

const {
  NODE_URL,
  CHAIN_ID ,
  LP_STAKING_PUBLIC_KEY,
  LP_STAKING_POOLS_PUBLIC_KEY,
  USDC_ASSET_ID,
  USDT_ASSET_ID,
} = process.env;
const api = create(NODE_URL);

const lpStakingAddress = libs.crypto.address({ publicKey: LP_STAKING_PUBLIC_KEY }, CHAIN_ID)

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
  matches: encodeURIComponent(`%s%d%s%s__G__(${usdtInternalAssetId}|${usdcInternalAssetId})__.+`),
});
const internalToBaseAssetId = {
  [usdtInternalAssetId]: USDT_ASSET_ID,
  [usdcInternalAssetId]: USDC_ASSET_ID,
}
const requestsInfo = {
  [USDC_ASSET_ID]: { totalAmount: new BigNumber(0), users: {} },
  [USDT_ASSET_ID]: { totalAmount: new BigNumber(0), users: {} },
}
for (const { key, value } of operationsData) {
  const statusPending = 'PENDING'
  const internalBaseAssetId = key.split(separator)[2]
  const baseAssetId = internalToBaseAssetId[internalBaseAssetId]
  const userAddress = key.split(separator)[3]
  const status = value.split(separator)[1]
  const inAssetAmount = new BigNumber(value.split(separator)[2])
  if (status != statusPending) continue
  requestsInfo[baseAssetId]['users'][userAddress] = (requestsInfo[baseAssetId]['users'][userAddress] || new BigNumber(0)).add(inAssetAmount)
  requestsInfo[baseAssetId]['totalAmount'] = requestsInfo[baseAssetId]['totalAmount'].add(inAssetAmount)
}

const keyShareAssetAmountToConvert = (baseAssetId) => ['%s%s', baseAssetId, 'shareAssetAmountToConvert'].join(separator)
const keyUserShareAssetAmountToConvert = (baseAssetId, userAddress) => ['%s%s%s', baseAssetId, userAddress, 'shareAssetAmountToConvert'].join(separator)
const keyAssetConfig = (baseAsset) => ['%s%s%s', 'config', 'asset', baseAsset].join(separator)
const actions = []
const reissues = []
for (const baseAsset in requestsInfo) {
  const { value: baseAssetConfig } = await api.addresses.fetchDataKey(lpStakingAddress, keyAssetConfig(baseAsset))
  const shareAssetId = baseAssetConfig.split(separator)[1]
  reissues.push(reissue({
    assetId: shareAssetId,
    quantity: requestsInfo[baseAsset]['totalAmount'].toString(),
    reissuable: true,
    senderPublicKey: LP_STAKING_PUBLIC_KEY,
  }))
  actions.push({
    key: keyShareAssetAmountToConvert(baseAsset),
    type: 'integer',
    value: requestsInfo[baseAsset]['totalAmount'].toString(),
  })
  for (const userAddress in requestsInfo[baseAsset]['users']) {
    actions.push({
      key: keyUserShareAssetAmountToConvert(baseAsset, userAddress),
      type: 'integer',
      value: requestsInfo[baseAsset]['users'][userAddress].toString(),
    })
  }
}
const chunkSize = 100;
const actionsChunks = Array.from({ length: Math.ceil(actions.length / chunkSize) }, () => [])
for (const i in actions) {
  const chunkIndex = Math.floor(i / chunkSize)
  actionsChunks[chunkIndex].push(actions[i])
}
const dataTxs = actionsChunks.map((changes) => data({
  data: changes,
  chainId: CHAIN_ID,
  senderPublicKey: LP_STAKING_POOLS_PUBLIC_KEY,
  additionalFee: 4e5,
}));

await writeFile('reissues.json', JSON.stringify(reissues, null, 2))
await writeFile('get_requests.json', JSON.stringify(dataTxs, null, 2))
