export const calcRewardSimple = ({
  releaseRate = 0,
  dh = 1,
  stakedTotal = 0,
  stakedByUser = 0,
  poolWeight = 0,
  boostCoeff = 5,
  userVoteStaked = 1,
  totalVotesStaked = 1,
}) => {
  console.log('releaseRate: ', releaseRate);
  console.log('dh: ', dh);
  console.log('stakedTotal: ', stakedTotal);
  console.log('stakedByUser: ', stakedByUser);
  console.log('poolWeight: ', poolWeight);
  console.log('boostCoeff: ', boostCoeff);
  console.log('userVoteStaked: ', userVoteStaked);
  console.log('totalVotesStaked: ', totalVotesStaked);

  // releaseRatePool = releaseRate * poolWeight
  // const mult3 = 1000;
  const mult8 = 100000000;
  const releaseRatePool = BigInt(Math.floor((releaseRate * poolWeight) / mult8));
  console.log('releaseRatePool: ', releaseRatePool);
  // minPart = 1 / boostCoeff
  // const minPart = 1n / BigInt(boostCoeff);
  // console.log(minPart);
  // boostPart = (boostCoeff - 1) / boostCoeff
  // const boostPart = (BigInt(boostCoeff) - 1n) / BigInt(boostCoeff);
  // console.log(boostPart);
  // releaseRatePoolBase = releaseRatePool * minPart
  const releaseRatePoolBase = releaseRatePool / BigInt(boostCoeff);
  console.log('releaseRatePoolBase: ', releaseRatePoolBase);
  // releaseRatePoolBoost = releaseRatePool * boostPart
  const releaseRatePoolBoost = (releaseRatePool * (BigInt(boostCoeff) - 1n)) / BigInt(boostCoeff);
  console.log('releaseRatePoolBoost: ', releaseRatePoolBoost);

  // reward = releaseRatePoolBase * dh * stakedByUser / stakedTotal
  const reward = ((releaseRatePoolBase * BigInt(dh)) * BigInt(stakedByUser)) / BigInt(stakedTotal);
  console.log('reward', reward);
  // boostedRewardRaw = releaseRatePoolBoost * dh * userVoteStaked / totalVotesStaked
  const boostedRewardRaw = (
    (releaseRatePoolBoost * BigInt(dh)) * BigInt(stakedByUser)
  ) / BigInt(stakedTotal);
  console.log(boostedRewardRaw);
  // boostedReward = min((boostCoeff - 1) * reward, boostedRewardRaw)
  const bigIntMin = (...args) => args.reduce((m, e) => (e < m ? e : m));
  const boostedReward = bigIntMin((BigInt(boostCoeff) - 1n) * reward, boostedRewardRaw);
  console.log('boostedReward', boostedReward);

  return { reward, boostedReward };
};
