import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const lpStableMock = {
  setPutOneTknV2Result: async ({
    caller,
    value,
  }) => {
    const dataTx = data({
      data: [
        { key: 'putOneTknV2Result', type: 'integer', value },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  setUnstakeAndGetOneTknV2Result: async ({
    caller,
    value,
  }) => {
    const dataTx = data({
      data: [
        { key: 'unstakeAndGetOneTknV2Result', type: 'integer', value },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
