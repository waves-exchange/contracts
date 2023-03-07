import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const factoryMock = {
  setPoolAndAsset: async ({
    caller,
    poolAddress,
    lpAssetId,
  }) => {
    const dataTx = data({
      data: [
        { key: 'poolContractAddress', type: 'string', value: poolAddress },
        { key: 'lpAssetId', type: 'string', value: lpAssetId },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
