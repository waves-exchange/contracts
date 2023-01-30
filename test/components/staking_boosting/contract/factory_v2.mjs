import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId, separator } from '../../../utils/api.mjs';

export const factory = {
  init: async ({
    caller,
    stakingAddress = '',
    boostingAddress = '',
    idoAddress = '',
    teamAddress = '',
    emissionAddress = '',
    restAddress = '',
    slippageAddress = '',
    daoAddress = '',
    marketingAddress = '',
    gwxAddress = '',
    birdsAddress = '',
  }) => {
    const dataTx = data({
      data: [
        {
          key: ['%s', 'factoryConfig'].join(separator),
          type: 'string',
          value: [
            '%s%s%s%s%s%s%s%s%s%s%s',
            stakingAddress,
            boostingAddress,
            idoAddress,
            teamAddress,
            emissionAddress,
            restAddress,
            slippageAddress,
            daoAddress,
            marketingAddress,
            gwxAddress,
            birdsAddress,
          ].join(separator),
        },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
