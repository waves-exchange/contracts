import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  broadcast, nodeInteraction, signTx,
} from '@waves/waves-transactions';
import { Level } from 'level';

const defaultBatchSize = 10;
const argv = yargs(hideBin(process.argv))
  .option('batchSize', { type: 'number', default: defaultBatchSize })
  .option('nodeUrl', { type: 'string' })
  .option('privateKey', { type: 'string' })
  .option('dbPath', { type: 'string' })
  .demandOption(['nodeUrl', 'privateKey', 'dbPath'])
  .parse();

try {
  const {
    dbPath, nodeUrl, privateKey, batchSize,
  } = argv;
  const db = new Level(dbPath, { valueEncoding: 'json', createIfMissing: false });
  const txsBuffer = [];
  for await (const [key, tx] of db.iterator()) {
    if (txsBuffer.length === batchSize) {
      await Promise.allSettled(txsBuffer);
      txsBuffer.length = 0;
    }
    const processTx = async () => {
      try {
        console.info(`Processing ${tx.id}`);
        console.log = () => null;
        const signedTx = signTx(tx, { privateKey });
        await broadcast(signedTx, nodeUrl);
        await nodeInteraction.waitForTx(tx.id, { apiBase: nodeUrl });
        await db.del(key);
      } catch {
        console.info(`Rejected ${tx.id}`);
      }
    };
    txsBuffer.push(processTx());
  }
  await Promise.allSettled(txsBuffer);
} catch (error) {
  console.error(error);
}
