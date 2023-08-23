import { data, invokeScript } from '@waves/waves-transactions';
import wc from '@waves/ts-lib-crypto';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export class GwxReward {
  seed = '';

  get address() {
    return wc.address(this.seed, chainId);
  }

  static calcReward({
    releaseRateList, gwxHoldersRewardList, dhList, userGwxAmountList, totalGwxAmountList,
  }) {
    if (
      dhList.length !== userGwxAmountList.length
      || dhList.length !== totalGwxAmountList.length
    ) throw new Error('invalid input data');
    let rewardRaw = 0;
    for (let i = 0; i < dhList.length; i += 1) {
      rewardRaw += (
        releaseRateList[i] * gwxHoldersRewardList[i] * dhList[i] * userGwxAmountList[i]
      ) / (totalGwxAmountList[i] * 1e8);
    }
    const reward = Math.floor(rewardRaw);

    return reward;
  }

  init({
    referralAddress,
    wxAssetId,
    matcherPacemakerAddress,
    boostingContractAddress,
    gwxRewardEmissionPartStartHeight,
    emissionContractAddress,
  }) {
    const dataTx = data({
      data: [
        { key: '%s__config', type: 'string', value: `%s%s%s__${wxAssetId}__${matcherPacemakerAddress}__${boostingContractAddress}` },
        { key: '%s%s__config__referralsContractAddress', type: 'string', value: referralAddress },
        { key: '%s%s__config__emissionAddress', type: 'string', value: emissionContractAddress },
        { key: '%s%s__gwxRewardEmissionPart__startHeight', type: 'integer', value: gwxRewardEmissionPartStartHeight },
      ],
      additionalFee: 4e5,
      chainId,
    }, this.seed);

    return broadcastAndWait(dataTx);
  }

  claimReward({
    caller,
  }) {
    return broadcastAndWait(invokeScript({
      dApp: this.address,
      call: {
        function: 'claimReward',
        args: [],
      },
      chainId,
    }, caller));
  }
}

export const gwx = new GwxReward();
