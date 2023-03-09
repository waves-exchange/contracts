import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const stakingMock = {
  setTotalReward: async ({
    caller,
    totalReward,
  }) => {
    const dataTx = data({
      data: [
        { key: 'totalReward', type: 'integer', value: totalReward },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  setStakedByUser: async ({
    caller,
    value,
  }) => {
    const dataTx = data({
      data: [
        { key: 'stakedByUser', type: 'integer', value },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
