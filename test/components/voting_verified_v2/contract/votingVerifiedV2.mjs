import { data, invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const votingVerifiedV2 = {
  init: async ({
    caller,
    minPeriodLength,
    maxPeriodLength,
    boostingContract,
    emissionContract,
    assetsStoreContract,
    votingThresholdAdd,
    votingThresholdRemove,
    minSuggestRemoveBalance,
    periodLengthRemove,
    wxMinForSuggestAddAmountRequired,
    wxForSuggestRemoveAmountRequired,
    feePerBlock,
  }) => {
    const dataTx = data(
      {
        data: [
          {
            key: '%s__minPeriodLength',
            type: 'integer',
            value: minPeriodLength,
          },
          {
            key: '%s__maxPeriodLength',
            type: 'integer',
            value: maxPeriodLength,
          },
          {
            key: '%s__boostingContract',
            type: 'string',
            value: boostingContract,
          },
          {
            key: '%s__emissionContract',
            type: 'string',
            value: emissionContract,
          },
          {
            key: '%s__assetsStoreContract',
            type: 'string',
            value: assetsStoreContract,
          },
          {
            key: '%s%s__votingThreshold__add',
            type: 'integer',
            value: votingThresholdAdd,
          },
          {
            key: '%s%s__votingThreshold__remove',
            type: 'integer',
            value: votingThresholdRemove,
          },
          {
            key: '%s__minSuggestRemoveBalance',
            type: 'integer',
            value: minSuggestRemoveBalance,
          },
          {
            key: '%s__periodLengthRemove',
            type: 'integer',
            value: periodLengthRemove,
          },
          {
            key: '%s__wxMinForSuggestAddAmountRequired',
            type: 'integer',
            value: wxMinForSuggestAddAmountRequired,
          },
          {
            key: '%s__wxForSuggestRemoveAmountRequired',
            type: 'integer',
            value: wxForSuggestRemoveAmountRequired,
          },
          {
            key: '%s__feePerBlock',
            type: 'integer',
            value: feePerBlock,
          },
        ],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(dataTx);
  },

  suggestAdd: async ({
    caller,
    dApp,
    assetId,
    periodLength,
    assetImage,
    payments,
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
        payment: payments,
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  vote: async ({
    caller, dApp, assetId, inFavor,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'vote',
          args: [
            { type: 'string', value: assetId },
            { type: 'boolean', value: inFavor },
          ],
        },
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  cancelVote: async ({ caller, dApp, assetId }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'cancelVote',
          args: [{ type: 'string', value: assetId }],
        },
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  finalize: async ({ caller, dApp, assetId }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'finalize',
          args: [{ type: 'string', value: assetId }],
        },
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  claim: async ({
    caller, dApp, assetId, index,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'claim',
          args: [
            { type: 'string', value: assetId },
            { type: 'integer', value: index },
          ],
        },
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );

    return broadcastAndWait(invokeTx);
  },

  suggestRemove: async ({
    caller, dApp, assetId, payments,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'suggestRemove',
          args: [{ type: 'string', value: assetId }],
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
