import { setScript, nodeInteraction } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { readFile } from 'fs/promises';
import ride from '@waves/ride-js';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;

const chainId = 'R';
const api = create(apiBase);

export const compileScript = (
  script,
  transform = null,
  libraries = {},
) => {
  let transformFunc = transform;
  if (!transform) transformFunc = (x) => x;
  const estimatorVersion = undefined;
  const compact = false;
  const removeUnused = false;
  const compilation = ride.compile(
    transformFunc(script),
    estimatorVersion,
    compact,
    removeUnused,
    libraries,
  );
  if (compilation.error) {
    throw new Error(compilation.error);
  }

  return compilation.result;
};

export const compileScriptFromFile = async (
  path,
  transform = null,
  libraries = {},
) => {
  const script = await readFile(path, { encoding: 'utf-8' });
  const result = compileScript(script, transform, libraries);

  return result;
};

/**
 * @param {string} path
 * @param {string} account
 * @param {function(*): *} transform
 */
export const setScriptFromFile = async (
  path,
  account,
  transform = null,
  libraries = {},
) => {
  const { base64, size } = await compileScriptFromFile(path, transform, libraries);
  const waveletsPerKilobyte = 1e5;
  const bitsInByte = 1024;
  const min = 1000000;
  let fee = Math.ceil(size / bitsInByte) * waveletsPerKilobyte;
  if (fee < min) {
    fee = min;
  }
  fee += 4e5;
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
