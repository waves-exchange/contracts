import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const emission = {
  init: async ({
    caller,
    factoryAddress,
    ratePerBlockMax,
    ratePerBlock,
    emissionStartBlock,
    emissionDuration,
    wxAssetId,
  }) => {
    const dataTx = data({
      data: [
        {
          key: '%s%s__ratePerBlockMax__current',
          type: 'integer',
          value: ratePerBlockMax,
        },
        {
          key: '%s%s__ratePerBlock__current',
          type: 'integer',
          value: ratePerBlock,
        },
        {
          key: '%s%s__emission__startBlock',
          type: 'integer',
          value: emissionStartBlock,
        },
        {
          key: '%s%s__emission__duration',
          type: 'integer',
          value: emissionDuration,
        },
        {
          key: '%s%s__emission__endBlock',
          type: 'integer',
          value: emissionStartBlock + emissionDuration,
        },
        {
          key: '%s%s__config__factoryAddress',
          type: 'string',
          value: factoryAddress,
        },
        {
          key: '%s__config',
          type: 'string',
          value: `%s__${wxAssetId}`,
        },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
  setBoostCoeff: async ({
    caller,
    boostCoeff,
  }) => {
    const dataTx = data({
      data: [
        {
          key: '%s__boostCoeff',
          type: 'integer',
          value: boostCoeff,
        },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
