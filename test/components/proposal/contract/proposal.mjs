import { invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const proposal = {
  startNewVote: async ({
    dApp, caller, payments = [],
    name, description, duration, quorumNumber,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'startNewVote',
          args: [
            { type: 'string', value: name },
            { type: 'string', value: description },
            { type: 'integer', value: duration },
            { type: 'integer', value: quorumNumber },
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

  voteFor: async ({
    dApp, caller, payments = [],
    proposalIndex, choice,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'voteFor',
          args: [
            { type: 'integer', value: proposalIndex },
            { type: 'boolean', value: choice },
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
