import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId, separator } from '../../../utils/api.mjs';

export const kPublicKeys = '%s__publicKeys';
export const kQuorum = '%s__quorum';

export const kStatus = (address, txId) => ['%s__status', address, txId].join(separator);
export const kConfirm = (address, txId) => ['%s__confirm', address, txId].join(separator);

export const init = async ({
  dApp,
  caller,
  owners = [],
  quorum = 0,
  payments = [],
  additionalFee = 0,
  dry = false,
}) => {
  const tx = invokeScript(
    {
      dApp,
      call: {
        function: 'init',
        args: [
          {
            type: 'list',
            value: owners.map((value) => ({ type: 'string', value })),
          },
          { type: 'integer', value: quorum },
        ],
      },
      payment: payments,
      additionalFee,
      chainId,
    },
    caller,
  );
  if (dry) {
    return tx;
  }
  return broadcastAndWait(tx);
};

export const confirmTransaction = async ({
  dApp,
  caller,
  address,
  txId,
  payments = [],
  additionalFee = 0,
  dry = false,
}) => {
  const tx = invokeScript(
    {
      dApp,
      call: {
        function: 'confirmTransaction',
        args: [
          { type: 'string', value: address },
          { type: 'string', value: txId },
        ],
      },
      payment: payments,
      additionalFee,
      chainId,
    },
    caller,
  );
  if (dry) {
    return tx;
  }
  return broadcastAndWait(tx);
};

export const revokeConfirmation = async ({
  dApp,
  caller,
  address,
  txId,
  payments = [],
  additionalFee = 0,
  dry = false,
}) => {
  const tx = invokeScript(
    {
      dApp,
      call: {
        function: 'revokeConfirmation',
        args: [
          { type: 'string', value: address },
          { type: 'string', value: txId },
        ],
      },
      payment: payments,
      additionalFee,
      chainId,
    },
    caller,
  );
  if (dry) {
    return tx;
  }
  return broadcastAndWait(tx);
};

export const addOwner = async ({
  dApp,
  caller,
  publicKey,
  payments = [],
  additionalFee = 0,
  dry = false,
}) => {
  const tx = invokeScript(
    {
      dApp,
      call: {
        function: 'addOwner',
        args: [
          { type: 'string', value: publicKey },
        ],
      },
      payment: payments,
      additionalFee,
      chainId,
    },
    caller,
  );
  if (dry) {
    return tx;
  }
  return broadcastAndWait(tx);
};

export const removeOwner = async ({
  dApp,
  caller,
  publicKey,
  payments = [],
  additionalFee = 0,
  dry = false,
}) => {
  const tx = invokeScript(
    {
      dApp,
      call: {
        function: 'removeOwner',
        args: [
          { type: 'string', value: publicKey },
        ],
      },
      payment: payments,
      additionalFee,
      chainId,
    },
    caller,
  );
  if (dry) {
    return tx;
  }
  return broadcastAndWait(tx);
};

export const setQuorum = async ({
  dApp,
  caller,
  quorum,
  payments = [],
  additionalFee = 0,
  dry = false,
}) => {
  const tx = invokeScript(
    {
      dApp,
      call: {
        function: 'setQuorum',
        args: [
          { type: 'integer', value: quorum },
        ],
      },
      payment: payments,
      additionalFee,
      chainId,
    },
    caller,
  );
  if (dry) {
    return tx;
  }
  return broadcastAndWait(tx);
};
