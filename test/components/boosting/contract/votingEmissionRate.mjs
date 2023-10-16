import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const votingEmissionRate = {
  init: async ({
    dApp,
    caller,
    startHeight,
  }) => {
    const dataTx = data(
      {
        dApp,
        data: [
          { key: '%s__startHeight', type: 'integer', value: startHeight },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(dataTx);
  },
};
