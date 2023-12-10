import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const assetsStore = {
  init: async ({
    caller,
    factoryAddress,
    factoryPublicKey,
    votingVerifiedV2PublicKey,
    labels,
  }) => {
    const dataTx = data(
      {
        data: [
          {
            key: '%s__factoryContract',
            type: 'string',
            value: factoryAddress,
          },
          {
            key: '%s__adminPubKeys',
            type: 'string',
            value: `${factoryPublicKey}__${votingVerifiedV2PublicKey}`,
          },
          {
            key: '%s__labels',
            type: 'string',
            value: labels,
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
