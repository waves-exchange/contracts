import { setScript, nodeInteraction } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { readFile } from 'fs/promises';
import ride from '@waves/ride-js';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;

const chainId = 'R';
const api = create(apiBase);

/**
 * @param {string} path
 * @param {string} account
 * @param {function(*): *} transform
 */
export const setScriptFromFile = async (
  path,
  account,
  transform = (content) => content,
) => {
  const { base64, size } = ride.compile(transform(await readFile(path, { encoding: 'utf-8' }))).result;
  const waveletsPerKilobyte = 1e5;
  const bitsInByte = 1024;
  const min = 1000000;
  let fee = Math.ceil(size / bitsInByte) * waveletsPerKilobyte;
  if (fee < min) {
    fee = min;
  }
  const ssTx = setScript({
    script: base64,
    chainId,
    fee,
  }, account);
  await api.transactions.broadcast(ssTx, {});
  await waitForTx(ssTx.id, { apiBase });
};

export const checkStateChanges = async (
  stateChanges,
  countData,
  countTransfers,
  countIssues,
  countReissues,
  countBurns,
  countSponsorFees,
  countLeases,
  countLeaseCancels,
  countInvokes,
) => {
  if (stateChanges.data.length !== countData) return false;
  if (stateChanges.transfers.length !== countTransfers) return false;
  if (stateChanges.issues.length !== countIssues) return false;
  if (stateChanges.reissues.length !== countReissues) return false;
  if (stateChanges.burns.length !== countBurns) return false;
  if (stateChanges.sponsorFees.length !== countSponsorFees) return false;
  if (stateChanges.leases.length !== countLeases) return false;
  if (stateChanges.leaseCancels.length !== countLeaseCancels) return false;
  if (stateChanges.invokes.length !== countInvokes) return false;

  return true;
};