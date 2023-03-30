import { data, invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const votingEmission = {
  create: async ({
    dApp,
    caller,
    amountAssetId,
    priceAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'create',
          args: [
            { type: 'string', value: amountAssetId },
            { type: 'string', value: priceAssetId },
          ],
        },
        additionalFee: 4e5,
        payment: [],
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  updateEpochUiKey: async ({
    caller,
    epochUiKey,
    epochStartHeight,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__epochUiKey', type: 'integer', value: epochUiKey },
        { key: '%s__currentEpochUi', type: 'integer', value: 1 },
        { key: '%s%d__startHeight__1', type: 'integer', value: epochStartHeight },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
