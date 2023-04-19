import { data, invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const gwxReward = {
  init: async ({
    caller,
    wxAssetId,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__wxAssetId', type: 'string', value: wxAssetId },
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
};
