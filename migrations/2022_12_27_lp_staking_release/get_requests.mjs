import { create } from '@waves/node-api-js'
import { BigNumber } from '@waves/bignumber'
import { data } from '@waves/waves-transactions'
import { writeFile } from 'fs/promises'

const {
  NODE_URL = 'https://nodes.wavesnodes.com',
  CHAIN_ID = 'W',
  LP_STAKING_ADDRESS = '3P6SFR9ZZwKHZw5mMDZxpXHEhg1CXjBb51y',
  LP_STAKING_POOLS_PUBLIC_KEY = 'F4oaTkX67vt2MEsXLJJ8a7gaURGjW7x8fkvGfdEiH5oy',
  USDC_ASSET_ID = '6XtHjpXbs9RRJP2Sr9GUyVqzACcby9TkThHXnjVC5CDJ',
  USDT_ASSET_ID = '34N9YcEETLWn93qYQ64EsP1x89tSruJU44RrEMSXXEPJ',
} = process.env;
const api = create(NODE_URL);
// key operation ["%s%d%s%s", operationType, internalBaseAssetStr, userAddress, txId]
const keyMapBaseToInternal = (baseAsset) =>
  `%s%s%s__mappings__baseAsset2internalId__${baseAsset}`;
const { value: usdtInternalAssetId } = await api.addresses.fetchDataKey(
  LP_STAKING_ADDRESS,
  keyMapBaseToInternal(USDT_ASSET_ID)
);
const { value: usdcInternalAssetId } = await api.addresses.fetchDataKey(
  LP_STAKING_ADDRESS,
  keyMapBaseToInternal(USDC_ASSET_ID)
);
const operationsData = await api.addresses.data(LP_STAKING_ADDRESS, {
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
  const internalBaseAssetId = key.split('__')[2]
  const baseAssetId = internalToBaseAssetId[internalBaseAssetId]
  const userAddress = key.split('__')[3]
  const status = value.split('__')[1]
  const inAssetAmount = new BigNumber(value.split('__')[2])
  if (status != statusPending) continue
  requestsInfo[baseAssetId]['users'][userAddress] = (requestsInfo[baseAssetId]['users'][userAddress] || new BigNumber(0)).add(inAssetAmount)
  requestsInfo[baseAssetId]['totalAmount'] = requestsInfo[baseAssetId]['totalAmount'].add(inAssetAmount)
}

const keyShareAssetAmountToConvert = (baseAssetId) => ['%s%s', baseAssetId, 'shareAssetAmountToConvert'].join('__')
const keyUserShareAssetAmountToConvert = (baseAssetId, userAddress) => ['%s%s%s', baseAssetId, userAddress, 'shareAssetAmountToConvert'].join('__')
const actions = []
for (const baseAsset in requestsInfo) {
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

await writeFile('get_requests.json', JSON.stringify(dataTxs, null, 2))
