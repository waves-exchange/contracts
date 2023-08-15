import { data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const gwx = {
  init: async ({
    caller,
    referralAddress,
    wxAssetId,
    matcherPacemakerAddress,
    boostingContractAddress,
    gwxRewardEmissionPartStartHeight,
    emissionContractAddress,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__config', type: 'string', value: `%s%s%s__${wxAssetId}__${matcherPacemakerAddress}__${boostingContractAddress}` },
        { key: '%s%s__config__referralsContractAddress', type: 'string', value: referralAddress },
        { key: '%s%s__config__emissionAddress', type: 'string', value: emissionContractAddress },
        { key: '%s%s__gwxRewardEmissionPart__startHeight', type: 'integer', value: gwxRewardEmissionPartStartHeight },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },
};
