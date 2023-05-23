import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const votingVerifiedV2 = {
  suggestAdd: async ({
    caller,
    dApp,
    assetId,
    periodLength,
    assetImage,
    wxAssetId,
    assetAmount,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'suggestAdd',
          args: [
            { type: 'string', value: assetId },
            { type: 'integer', value: periodLength },
            { type: 'string', value: assetImage },
          ],
        },
        payment: [
          { assetId: wxAssetId, amount: assetAmount },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },
};
