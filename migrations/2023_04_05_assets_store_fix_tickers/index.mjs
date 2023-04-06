import { create } from '@waves/node-api-js'
import { data } from '@waves/waves-transactions'
import { join } from 'path'
import { readdir, unlink, writeFile } from 'fs/promises'
import { address } from '@waves/ts-lib-crypto'
import config from './config.mjs'

const network = 'mainnet'
const { nodeUrl, chainId, assetsStorePublicKey } = config[network]

const separator = '__'

const assetsStoreAddress = address({ publicKey: assetsStorePublicKey }, chainId)

const nodeApi = create(nodeUrl)

const keyAssetIdToTicker = (assetId) => `%s%s__assetId2ticker__${assetId}`
const keyTickerToAssetId = (ticker) => `%s%s__ticker2assetId__${ticker}`

const fetchCurrentState = async () => {
  const [assetIdToTickerData, tickerToAssetIdData] = await Promise.all([
    nodeApi.addresses.data(
      assetsStoreAddress,
      {
        matches: encodeURIComponent(keyAssetIdToTicker('.+'))
      },
      {}
    ),
    nodeApi.addresses.data(
      assetsStoreAddress,
      {
        matches: encodeURIComponent(keyTickerToAssetId('.+'))
      },
      {}
    )
  ])

  const targetIndex = 2
  const formatData = (arr) =>
    Array.prototype.reduce.call(
      arr,
      (acc, { key, value }) => ({
        ...acc,
        [key.split(separator)[targetIndex]]: value
      }),
      {}
    )
  return {
    assetIdToTicker: formatData(assetIdToTickerData),
    tickerToAssetId: formatData(tickerToAssetIdData)
  }
}

const getTxs = async () => {
  const { assetIdToTicker, tickerToAssetId } = await fetchCurrentState()
  for (let assetId in assetIdToTicker) {
    const ticker = assetIdToTicker[assetId]
    if (tickerToAssetId[ticker] == assetId) {
      delete tickerToAssetId[ticker]
    }
  }

  const actions = Object.keys(tickerToAssetId).map((ticker) => ({
    key: keyTickerToAssetId(ticker)
  }))

  const chunkSize = 100
  const actionsChunks = Object.values(
    actions.reduce((acc, cur, idx) => {
      const chunkIndex = Math.floor(idx / chunkSize)
      return {
        ...acc,
        [chunkIndex]: [...(acc[chunkIndex] || []), cur]
      }
    }, {})
  )

  return actionsChunks.map((changes) =>
    data({
      data: changes,
      chainId,
      senderPublicKey: assetsStorePublicKey,
      additionalFee: 4e5
    })
  )
}

try {
  const txsPath = 'txs'

  // clear txs dir
  const exclude = ['.gitignore']
  const files = await readdir(txsPath)
  await Promise.all(
    files.map(async (name) => {
      if (exclude.includes(name)) return name
      return unlink(join(txsPath, name))
    })
  )

  const fileName = 'delete_broken_tickers'
  const txs = (await getTxs()).map((tx) => [tx, fileName])

  await Promise.all(
    txs.map(async ([tx, name], idx) => {
      await writeFile(
        join(txsPath, `${idx}${name ? '_' : ''}${name || ''}.json`),
        JSON.stringify(tx, null, 2)
      )
    })
  )
} catch (error) {
  console.error(error)
}
