import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const factoryV2 = {
  init: async ({
    caller,
    assetsStoreAddress,
  }) => {
    const dataTx = data(
      {
        data: [
          {
            key: '%s__assetsStoreContract',
            type: 'string',
            value: assetsStoreAddress,
          },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(dataTx);
  },
};
