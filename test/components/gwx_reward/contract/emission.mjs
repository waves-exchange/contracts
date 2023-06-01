import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const emission = {
  init: async ({
    caller,
    config,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__config', type: 'string', value: config },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
