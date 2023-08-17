import { data, invokeScript } from '@waves/waves-transactions';
import { base58Decode, base64Encode } from '@waves/ts-lib-crypto';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const gwxReward = {
  init: async ({
    caller,
    emissionAddress,
    wxAssetId,
    maxRecipients,
    matcherPacemakerAddress = '',
    boostingContractAddress,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__config', type: 'string', value: `%s%s%s__${wxAssetId}__${matcherPacemakerAddress}__${boostingContractAddress}` },
        { key: '%s%s__config__emissionAddress', type: 'string', value: emissionAddress },
        { key: '%s__wxAssetId', type: 'string', value: wxAssetId },
        { key: '%s__maxRecipients', type: 'integer', value: maxRecipients },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  tradeReward: async ({
    caller,
    gwxRewardAddress,
    userAddresses,
    rewards,
    payments,
  }) => {
    const userAddressesList = [];
    const rewardsList = [];
    userAddresses.forEach((address) => {
      userAddressesList.push({ type: 'string', value: address });
    });
    rewards.forEach((reward) => {
      rewardsList.push({ type: 'integer', value: reward });
    });

    const invokeTx = invokeScript(
      {
        dApp: gwxRewardAddress,
        call: {
          function: 'tradeReward',
          args: [
            {
              type: 'list',
              value: userAddressesList,
            },
            {
              type: 'list',
              value: rewardsList,
            },
          ],
        },
        payment: payments,
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  claimTradingReward: async ({
    caller,
    gwxRewardAddress,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp: gwxRewardAddress,
        call: {
          function: 'claimTradingReward',
        },
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  refreshUserReward: async ({
    caller,
    gwxRewardAddress,
    userAddress,
    userNum,
  }) => broadcastAndWait(
    invokeScript({
      dApp: gwxRewardAddress,
      call: {
        function: 'refreshUserReward',
        args: [
          { type: 'binary', value: base64Encode(base58Decode(userAddress)) },
          { type: 'integer', value: userNum },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, caller),
  ),
};
