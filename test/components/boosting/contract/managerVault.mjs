import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const managerVault = {
  init: async ({
    caller,
    managerPublicKey,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__managerPublickKey', type: 'string', value: managerPublicKey },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
