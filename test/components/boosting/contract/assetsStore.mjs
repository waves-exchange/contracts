import { data } from '@waves/waves-transactions';
import { publicKey } from '@waves/ts-lib-crypto';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const assetsStore = {
  init: async ({
    caller,
    factorySeed,
    labels,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__adminPubKeys', type: 'string', value: publicKey(factorySeed) },
        {
          key: '%s__labels',
          type: 'string',
          value: labels,
        },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
