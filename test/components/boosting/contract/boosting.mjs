import { data, invokeScript } from '@waves/waves-transactions';
import wc from '@waves/ts-lib-crypto';
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

const decayConstant = 8;
class Boosting {
  maxLockDuration = 0;

  blocksInPeriod = 0;

  seed = '';

  address() {
    return wc.address(this.seed, chainId);
  }

  calcGwxAmountStart({ wxAmount, duration }) {
    return Math.floor((wxAmount * duration) / this.maxLockDuration);
  }

  calcWxWithdrawable({
    lockWxAmount, lockDuration, passedPeriods,
  }) {
    const exponent = (passedPeriods * decayConstant * this.blocksInPeriod) / lockDuration;
    // TODO: if height > lockEnd then userAmount
    const wxWithdrawable = Math.floor(lockWxAmount * (1 - 0.5 ** exponent));

    return wxWithdrawable;
  }

  calcGwxAmountBurned({
    gwxAmountStart, gwxAmountPrev, passedPeriods,
  }) {
    const gwxBurned = Math.min(
      Math.floor(
        (passedPeriods * this.blocksInPeriod * gwxAmountStart) / this.maxLockDuration,
      ),
      gwxAmountPrev,
    );

    return gwxBurned;
  }

  async init({
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
  }) {
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
    }, this.seed);

    return broadcastAndWait(dataTx);
  }

  async lock({
    caller, duration, payments = [],
  }) {
    const invokeTx = invokeScript(
      {
        dApp: this.address(),
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
  }

  async unlock({
    caller, txId,
  }) {
    const invokeTx = invokeScript(
      {
        dApp: this.address(),
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
  }
}

export const boosting = new Boosting();
