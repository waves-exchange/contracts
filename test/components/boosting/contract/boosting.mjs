import { data, invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId } from '../../../utils/api.mjs';

export const boosting = {
  init: async ({
    caller,
    factoryAddress,
    referralsAddress,
    votingEmissionAddress,
    lpStakingPoolsAddress,
    lockAssetId,
    minLockAmount = 0,
    minLockDuration = 0,
    maxLockDuration,
    mathContract,
    nextUserNum = 0,
  }) => {
    const dataTx = data({
      data: [
        { key: '%s%s__config__factoryAddress', type: 'string', value: factoryAddress },
        { key: '%s%s__config__referralsContractAddress', type: 'string', value: referralsAddress },
        { key: '%s__lpStakingPoolsContract', type: 'string', value: lpStakingPoolsAddress },
        { key: '%s__nextUserNum', type: 'integer', value: nextUserNum },
        {
          key: '%s__config',
          type: 'string',
          value: `%s%d%d%d__${lockAssetId}__${minLockAmount}__${minLockDuration}__${maxLockDuration}__${mathContract}`,
        },
        { key: '%s__votingEmissionContract', type: 'string', value: votingEmissionAddress },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  lock: async ({
    dApp, caller, duration, payments = [],
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'lock',
          args: [
            { type: 'integer', value: duration },
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

  increaseLock: async ({
    dApp, caller, deltaDuration, payments = [],
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'increaseLock',
          args: [
            { type: 'integer', value: deltaDuration },
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
