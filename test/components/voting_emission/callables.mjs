import { invokeScript, data } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../utils/api.mjs';

export const votingEmission = {
  constructor: async ({
    dApp, caller,
    factoryContract,
    votingEmissionCandidateContract,
    boostingContract,
    stakingContract,
    votingEmissionRate,
    epochLength,
  }) => {
    await broadcastAndWait(data({
      data: [
        { key: '%s__votingEmissionRateContract', type: 'string', value: votingEmissionRate },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller));

    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'constructor',
          args: [
            { type: 'string', value: factoryContract },
            { type: 'string', value: votingEmissionCandidateContract },
            { type: 'string', value: boostingContract },
            { type: 'string', value: stakingContract },
            { type: 'integer', value: epochLength },
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

  create: async ({
    dApp, caller, amountAssetId, priceAssetId,
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
        payment: [],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  vote: async ({
    dApp, caller, amountAssetId, priceAssetId, amount,
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
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'finalize',
          args: [],
        },
        payment: [],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  finalizeHelper: async ({
    dApp, caller,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'finalizeHelper',
          args: [],
        },
        payment: [],
        additionalFee: 4e5,
        chainId,
      },
      caller,
    );
    return broadcastAndWait(invokeTx);
  },

  cancelVote: async ({
    dApp, caller, amountAssetId, priceAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'cancelVote',
          args: [
            { type: 'string', value: amountAssetId },
            { type: 'string', value: priceAssetId },
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

  setEpochLength: async ({
    dApp, caller, value,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'setEpochLength',
          args: [
            { type: 'integer', value },
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

export const boostingMock = {
  setUserGwxAmountAtHeight: async ({
    dApp, caller, userAddress, targetHeight, amount,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'setUserGwxAmountAtHeight',
          args: [
            { type: 'string', value: userAddress },
            { type: 'integer', value: targetHeight },
            { type: 'integer', value: amount },
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

export const factoryMock = {
  setWxEmissionPoolLabel: async ({
    dApp, caller, amountAssetId, priceAssetId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'setWxEmissionPoolLabel',
          args: [
            { type: 'string', value: amountAssetId },
            { type: 'string', value: priceAssetId },
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
