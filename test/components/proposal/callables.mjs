import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../utils/api.mjs';

export const votingEmission = {
  constructor: async ({
    dApp, caller,
    boostingContract,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'constructor',
          args: [
            { type: 'string', value: boostingContract },
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

  startNewVote: async ({
    dApp, caller, 
    description, expirationHeight, quorumNumber,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'startNewVote',
          args: [
            { type: 'string', value: description },
            { type: 'integer', value: expirationHeight },
            { type: 'integer', value: quorumNumber },
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

  voteFor: async ({
    dApp, caller, proposalIndex, choice,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'voteFor',
          args: [
            { type: 'string', value: proposalIndex },
            { type: 'bool', value: choice },
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

  deleteVote: async ({
    dApp, caller, proposalIndex,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'deleteVote',
          args: [
            { type: 'integer', value: proposalIndex },
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

