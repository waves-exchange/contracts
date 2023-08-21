import { data, invokeScript } from '@waves/waves-transactions';
import { broadcastAndWait, chainId, separator } from '../../../utils/api.mjs';

export const keyLock = (userAddress, txId) => ['%s%s%s', 'lock', userAddress, txId].join(separator);
export const keyUserGwxAmountTotal = (userAddress) => ['%s%s', 'gwxAmountTotal', userAddress].join(separator);

export const parseLockParams = (s) => {
  const [
    meta,
    wxAmount,
    startHeight,
    duration,
    lastUpdateTimestamp,
    gwxAmount,
    wxClaimed,
  ] = s.split(separator);

  return {
    meta,
    wxAmount: parseInt(wxAmount, 10),
    startHeight: parseInt(startHeight, 10),
    duration: parseInt(duration, 10),
    gwxAmount: parseInt(gwxAmount, 10),
    wxClaimed: parseInt(wxClaimed, 10),
    lastUpdateTimestamp: parseInt(lastUpdateTimestamp, 10),
  };
};

export const boosting = {
  init: async ({
    caller,
    factoryAddress,
    referralsAddress,
    votingEmissionAddress,
    lpStakingPoolsAddress,
    managerVaultAddress,
    lockAssetId,
    minLockAmount = 0,
    minLockDuration = 0,
    maxLockDuration,
    mathContract,
    nextUserNum = 0,
    blocksInPeriod,
    lockStepBlocks,
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
          value: `%s%d%d%d%s%d%d__${lockAssetId}__${minLockAmount}__${minLockDuration}__${maxLockDuration}__${mathContract}__${blocksInPeriod}__${lockStepBlocks}`,
        },
        { key: '%s__votingEmissionContract', type: 'string', value: votingEmissionAddress },
        { key: '%s__managerVaultAddress', type: 'string', value: managerVaultAddress },
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

  unlock: async ({
    dApp, caller, txId,
  }) => {
    const invokeTx = invokeScript(
      {
        dApp,
        call: {
          function: 'unlock',
          args: [
            { type: 'string', value: txId },
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
