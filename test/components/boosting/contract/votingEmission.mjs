import { data, invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const votingEmission = {
  init: async ({
    dApp,
    caller,
    factoryAddress,
    votingEmissionCandidateAddress,
    boostingAddress,
    stakingAddress,
    epochLength,
    votingEmissionRateAddress,
  }) => {
    const dataTx = data(
      {
        dApp,
        data: [
          { key: '%s__factoryContract', type: 'string', value: factoryAddress },
          { key: '%s__votingEmissionCandidateContract', type: 'string', value: votingEmissionCandidateAddress },
          { key: '%s__boostingContract', type: 'string', value: boostingAddress },
          { key: '%s__stakingContract', type: 'string', value: stakingAddress },
          { key: '%s__epochLength', type: 'integer', value: epochLength },
          { key: '%s__votingEmissionRateContract', type: 'string', value: votingEmissionRateAddress },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(dataTx);
  },

  create: async ({
    dApp,
    caller,
    amountAssetId,
    priceAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'create',
          args: [
            { type: 'string', value: amountAssetId },
            { type: 'string', value: priceAssetId },
          ],
        },
        additionalFee: 4e5,
        payment: [],
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  updateEpochUiKey: async ({
    caller,
    epochUiKey,
    epochStartHeight,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__epochUiKey', type: 'integer', value: epochUiKey },
        { key: '%s__currentEpochUi', type: 'integer', value: 1 },
        { key: '%s%d__startHeight__1', type: 'integer', value: epochStartHeight },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  updateEpochLength: async ({
    caller,
    epochLength,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s__epochLength', type: 'integer', value: epochLength },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  vote: async ({
    dApp,
    caller,
    amountAssetId,
    priceAssetId,
    amount,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'vote',
          args: [
            { type: 'string', value: amountAssetId },
            { type: 'string', value: priceAssetId },
            { type: 'integer', value: amount },
          ],
        },
        additionalFee: 4e5,
        payment: [],
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  finalize: async ({
    dApp,
    caller,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'finalize',
          args: [],
        },
        additionalFee: 4e5,
        payment: [],
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },
};
