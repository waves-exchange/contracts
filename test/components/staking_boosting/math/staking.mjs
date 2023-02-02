export const calcReward = ({
  releaseRate = 0,
  dh = 1,
  dhBoost = 1,
  totalStaked = 0,
  stakedByUser = 0,
  poolWeight = 0,
  totalGwx = 0,
  userGwx = 0,
}) => {
  const scale3 = 1000n;
  const scale8 = 100000000n;
  const releaseRateBase = (BigInt(releaseRate) * scale3) / 3n;
  const releaseRateBoost = (BigInt(releaseRate) * BigInt(dhBoost) * 2n) / 3n;
  const poolRateBase = (releaseRateBase * BigInt(poolWeight)) / scale8;
  const poolRateBoost = (releaseRateBoost * BigInt(poolWeight)) / scale8;
  const userRateBase = (poolRateBase * BigInt(stakedByUser) * scale8) / BigInt(totalStaked);
  const userRateBoost = (poolRateBoost * BigInt(userGwx)) / BigInt(totalGwx);
  const reward = (userRateBase * BigInt(dh)) / scale3 / scale8;
  const boostedRewardRaw = userRateBoost;
  const bigIntMin = (...args) => args.reduce((m, e) => (e < m ? e : m));
  const boostedReward = bigIntMin(boostedRewardRaw, reward * 2n);

  return { reward, boostedReward };
};
