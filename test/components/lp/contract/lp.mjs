import { invokeScript, data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const lp = {
  put: async ({
    dApp, caller,
    amountAssetId, amountAssetAmount,
    priceAssetId, priceAssetAmount,
    slippageTolerance = 0,
    autoStake = false,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'put',
          args: [
            { type: 'integer', value: slippageTolerance },
            { type: 'boolean', value: autoStake },
          ],
        },
        payment: [
          { assetId: amountAssetId, amount: amountAssetAmount },
          { assetId: priceAssetId, amount: priceAssetAmount },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  putOneTkn: async ({
    dApp, caller,
    assetId, amount,
    minOutAmount = 0,
    autoStake = false,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'putOneTkn',
          args: [
            { type: 'integer', value: minOutAmount },
            { type: 'boolean', value: autoStake },
          ],
        },
        payment: [
          { assetId, amount },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  getOneTkn: async ({
    dApp, caller,
    outAssetId,
    lpAssetId, lpAssetAmount,
    minOutAmount = 0,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'getOneTkn',
          args: [
            { type: 'string', value: outAssetId },
            { type: 'integer', value: minOutAmount },
          ],
        },
        payment: [
          { assetId: lpAssetId, amount: lpAssetAmount },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  unstakeAndGetOneTkn: async ({
    dApp, caller,
    unstakeAmount,
    outAssetId,
    minOutAmount = 0,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'unstakeAndGetOneTkn',
          args: [
            { type: 'integer', value: unstakeAmount },
            { type: 'string', value: outAssetId },
            { type: 'integer', value: minOutAmount },
          ],
        },
        payment: [],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  setFee: async ({
    senderPublicKey, caller,
    value,
  }) => {
    const key = '%s__fee';
    const dataTx = data(
      {
        data: [
          { key, type: 'integer', value },
        ],
        additionalFee: 4e5,
        senderPublicKey,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(dataTx);
  },
};
