import { data } from '@waves/waves-transactions'
import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
import { writeFile, readdir, unlink } from 'fs/promises'
import { join } from 'path'

config()

const txsPath = 'txs'

const {
  DB_URL: dbUrl,
  DB_COLLECTION: dbCollection,
  CHAIN_ID: chainId,
  KEY: key,
  TYPE: type,
  VALUE: value
} = process.env

const client = new MongoClient(dbUrl)
await client.connect()

const cursor = client.db().collection(dbCollection).find({})

const exclude = ['.gitkeep']
const files = await readdir(txsPath)
await Promise.all(
  files.map(async (name) => {
    if (exclude.includes(name)) return name
    return unlink(join(txsPath, name))
  })
)

const contractFilenames = new Set()

for await (const contract of cursor) {
  contractFilenames.add(contract.file)
  const dataTx = data({
    senderPublicKey: contract.base_pub,
    data: [{ key, type, value }],
    chainId
  })
  await writeFile(
    join(txsPath, `${contract.tag.replace(/\s|\//g, '_').toLowerCase()}.json`),
    JSON.stringify(dataTx, null, 2)
  )
}

console.log([...contractFilenames].sort())

await client.close()
