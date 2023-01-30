import { data, invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const staking = {
  init: async ({
    caller,
    factoryAddress,
    votingEmissionAddress,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s%s__config__factoryAddress', type: 'string', value: factoryAddress },
        { key: '%s__votingEmissionContract', type: 'string', value: votingEmissionAddress },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  stake: async ({
    dApp, caller, payments = [],
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'stake',
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

  claimWx: async ({
    dApp, caller, lpAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'claimWx',
          args: [
            { type: 'string', value: lpAssetId },
          ],
        },
        payment: [],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },
};
