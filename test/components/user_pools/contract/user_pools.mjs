import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const userPools = {
  create: async ({
    dApp, caller, payments = [],
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'create',
          args: [],
        },
        payment: payments,
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },
};
