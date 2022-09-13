import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../api.mjs';

export const otcMultiassetContract = {
  registerAsset: async (
    dApp,
    caller,
    assetAId,
    assetBId,
    withdrawDelay,
    depositFee,
    withdrawFee,
    minAmountDeposit,
    minAmountWithdraw,
    pairStatus,
    payment = [],
    notWait = false,
  ) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'registerAsset',
          args: [
            { type: 'string', value: assetAId },
            { type: 'string', value: assetBId },
            { type: 'integer', value: withdrawDelay },
            { type: 'integer', value: depositFee },
            { type: 'integer', value: withdrawFee },
            { type: 'integer', value: minAmountDeposit },
            { type: 'integer', value: minAmountWithdraw },
            { type: 'integer', value: pairStatus },
          ],
        },
        payment,
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    if (notWait) {
      return invokeTx;
    }
    return broadcastAndWait(invokeTx);
  },

  swapAssetsAToB: async (
    dApp,
    caller,
    assetBId,
    payment = [],
    notWait = false,
  ) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'swapAssetsAToB',
          args: [
            { type: 'string', value: assetBId },
          ],
        },
        payment,
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    if (notWait) {
      return invokeTx;
    }
    return broadcastAndWait(invokeTx);
  },
};
