import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const boostingMock = {
  setUserGWXData: async (caller, userAddress, gwxAmount) => {
    const dataTx = data(
      {
        data: [
          {
            key: userAddress,
            type: 'integer',
            value: gwxAmount,
          },
        ],
        chainId,
      },
      caller,
    );
    return broadcastAndWait(dataTx);
  },
};
