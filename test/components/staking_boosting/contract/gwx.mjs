import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const gwx = {
  init: async ({
    caller,
    referralAddress,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s%s__config__referralsContractAddress', type: 'string', value: referralAddress },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
