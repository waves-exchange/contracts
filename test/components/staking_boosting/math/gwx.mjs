export const calcGwxAmountStart = ({
  amount,
  lockDuration,
  maxLockDuration,
}) => {
  const gwxAmountStart = amount * (lockDuration / maxLockDuration);

  return Math.floor(gwxAmountStart);
};

export const calcGwxParams = ({
  amount,
  lockDuration,
  maxLockDuration,
  lockStartHeight,
}) => {
  const lockEnd = lockStartHeight + lockDuration;
  const gwxAmountStart = calcGwxAmountStart({ amount, lockDuration, maxLockDuration });
  const k = -gwxAmountStart / lockDuration;
  const b = gwxAmountStart * (lockEnd / lockDuration);

  return { k, b };
};

export const calcGwxAmountAtHeight = ({
  amount,
  lockDuration,
  maxLockDuration,
  lockStartHeight,
  height,
}) => {
  const { k, b } = calcGwxParams({
    amount,
    lockDuration,
    maxLockDuration,
    lockStartHeight,
  });
  const y = k * height + b;

  return Math.floor(y);
};
