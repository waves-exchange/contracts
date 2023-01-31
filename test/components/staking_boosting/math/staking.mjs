export const calcReward = ({
  releaseRate = 0,
  dh = 1,
  totalStaked = 0,
  stakedByUser = 0,
  poolWeight = 0,
  totalGwx = 0,
  userGwx = 0,
}) => {
  const releaseRateBase = releaseRate / 3;
  const releaseRateBoost = 2 * releaseRateBase;
  const poolRateBase = releaseRateBase * poolWeight;
  const poolRateBoost = releaseRateBoost * poolWeight;
  const userRateBase = poolRateBase * (stakedByUser / totalStaked);
  const userRateBoost = poolRateBoost * (userGwx / totalGwx);
  const reward = Math.floor(userRateBase * dh);
  const boostedRewardRaw = Math.floor(userRateBoost * dh);
  const boostedReward = Math.min(boostedRewardRaw, reward * 2);

  return { reward, boostedReward };
};
