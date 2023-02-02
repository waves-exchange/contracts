export const calcGwxAmountStart = ({
  amount,
  lockDuration,
  maxLockDuration,
}) => {
  const scale = 100000000n;
  const durationFraction = (BigInt(lockDuration) * scale) / BigInt(maxLockDuration);
  const gwxAmountStart = (BigInt(amount) * durationFraction) / scale;

  return gwxAmountStart;
};

export const calcGwxParams = ({
  amount,
  lockDuration,
  maxLockDuration,
  lockStartHeight,
}) => {
  const scale = 1000n;
  const lockEnd = BigInt(lockStartHeight) + BigInt(lockDuration);
  const gwxAmountStart = calcGwxAmountStart({ amount, lockDuration, maxLockDuration });
  const k = -(gwxAmountStart * scale) / BigInt(lockDuration);
  const b = ((gwxAmountStart * scale) / BigInt(lockDuration)) * lockEnd;

  return { k, b };
};

export const calcGwxAmountAtHeight = ({
  amount,
  lockDuration,
  maxLockDuration,
  lockStartHeight,
  height,
}) => {
  const scale = 1000n;
  const { k, b } = calcGwxParams({
    amount,
    lockDuration,
    maxLockDuration,
    lockStartHeight,
  });
  const y = (k * BigInt(height) + b) / scale;

  return y;
};
