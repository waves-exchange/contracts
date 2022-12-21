import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const lpStakingPools = {
  create: async ({
    dApp, caller,
    baseAssetId, shareAssetId = '',
    shareAssetName = '', shareAssetDescription = '', shareAssetLogo = '',
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'create',
          args: [
            { type: 'string', value: baseAssetId },
            { type: 'string', value: shareAssetId },
            { type: 'string', value: shareAssetName },
            { type: 'string', value: shareAssetDescription },
            { type: 'string', value: shareAssetLogo },
          ],
        },
        payment: [],
        additionalFee: 1e8,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  put: async ({
    dApp, caller, baseAssetAmount, baseAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'put',
          args: [],
        },
        payment: [
          { amount: baseAssetAmount, assetId: baseAssetId },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  claimShareAsset: async ({
    dApp, caller,
    baseAssetId,
    userAddress = '',
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'claimShareAsset',
          args: [
            { type: 'string', value: baseAssetId },
            { type: 'string', value: userAddress },
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

  get: async ({
    dApp, caller, shareAssetAmount, shareAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'get',
          args: [],
        },
        payment: [
          { amount: shareAssetAmount, assetId: shareAssetId },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  claimBaseAsset: async ({
    dApp, caller,
    baseAssetId, userAddress,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'claimBaseAsset',
          args: [
            { type: 'string', value: baseAssetId },
            { type: 'string', value: userAddress },
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

  finalize: async ({
    dApp, caller,
    baseAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'finalize',
          args: [
            { type: 'string', value: baseAssetId },
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
};
