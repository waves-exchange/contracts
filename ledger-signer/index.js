const wt = require('@waves/waves-transactions');
const ledgerLib = require('@waves/ledger');
const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid');
const fs = require('fs').promises;
const path = require('path');

const userNumber = 0;
const chainId = 87;
const node = 'https://nodes.wx.network';

(async () => {
  const waves = new ledgerLib.WavesLedger({ transport: TransportNodeHid.default, networkCode: chainId });
  const user = await waves.getUserDataById(userNumber);
  console.log('selected user:', user.address);

  const txs = "txs"
  const dir = await fs.readdir(txs);
  for (const filename of dir) {
    if (!filename.endsWith('.json')) {
      console.log('skip file:', filename);
      continue;
    }

    const buf = await fs.readFile(path.join(txs, filename));
    const tx = JSON.parse(buf.toString());

    tx.chainId = chainId;
    tx.timestamp = Date.now();
    tx.sender = wt.libs.crypto.address(tx.senderPublicKey, chainId);
    const txBytes = wt.makeTxBytes(tx);

    console.log('you are about to sign tx:', filename);
    const proof = await waves.signRequest(userNumber, { dataBuffer: txBytes });
    tx.proofs = tx.proofs || [];
    tx.proofs.push(proof);

    await wt.broadcast(tx, node);
    console.log('tx done:', filename);
  }
})();
