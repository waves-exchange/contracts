import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

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
}) => broadcastAndWait(
  invokeScript(
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
  ),
);
