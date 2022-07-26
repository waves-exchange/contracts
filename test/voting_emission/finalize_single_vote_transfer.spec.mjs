import { data } from '@waves/waves-transactions';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  api, broadcastAndWait, waitForHeight, chainId,
} from '../api.mjs';

import {
  votingEmission,
  boostingMock,
  factoryMock,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_emission: finalize_single_vote_transfer.spec.mjs', () => {
  const amountAssetId = 'amountAssetId';
  const amountAssetIdInternal = 0;
  const priceAssetId = 'priceAssetId';
  const priceAssetIdInternal = 1;
  const userGwxAmount = 1000;
  const newUserGwxAmount = userGwxAmount / 2;
  const epochLength = 2;
  const poolContract = 'poolContract';
  const poolLpAssetId = 'poolLpAssetId';
  before(async function () {
    const { addr: dApp, seed } = this.accounts.votingEmission;
    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__mappings__baseAsset2internalId__${amountAssetId}`, type: 'integer', value: amountAssetIdInternal },
        { key: `%s%s%s__mappings__baseAsset2internalId__${priceAssetId}`, type: 'integer', value: priceAssetIdInternal },
        { key: `%d%d%s%s__${amountAssetIdInternal}__${priceAssetIdInternal}__mappings__poolAssets2PoolContract`, type: 'string', value: poolContract },
        { key: `%s%s%s__${poolContract}__mappings__poolContract2LpAsset`, type: 'string', value: poolLpAssetId },
      ],
      additionalFee: 4e5,
      chainId,
    }, this.accounts.factory.seed));
    await votingEmission.constructor({
      dApp,
      caller: seed,
      factoryContract: this.accounts.factory.addr,
      votingEmissionCandidateContract: this.accounts.votingEmissionCandidate.addr,
      boostingContract: this.accounts.boosting.addr,
      stakingContract: this.accounts.staking.addr,
      epochLength,
    });
    await factoryMock.setWxEmissionPoolLabel({
      dApp: this.accounts.factory.addr,
      caller: this.accounts.factory.seed,
      amountAssetId,
      priceAssetId,
    });
    await votingEmission.create({
      dApp,
      caller: seed,
      amountAssetId,
      priceAssetId,
    });
    const { value: startHeight } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__0');
    const endHeight = startHeight + epochLength;
    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user1.addr,
      targetHeight: endHeight,
      amount: userGwxAmount,
    });
    await votingEmission.vote({
      dApp,
      caller: this.accounts.user1.seed,
      amountAssetId,
      priceAssetId,
      amount: userGwxAmount,
    });
    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user1.addr,
      targetHeight: endHeight + epochLength,
      amount: newUserGwxAmount,
    });
  });

  it('successfull finalize', async function () {
    const { addr: dApp } = this.accounts.votingEmission;
    const { value: startHeight } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__0');
    await waitForHeight(startHeight + epochLength);
    await votingEmission.finalize({
      dApp, caller: this.accounts.pacemaker.seed,
    });
    const poolWeightMult = 1e8;
    const totalVotes = userGwxAmount;
    const poolShare = (userGwxAmount / totalVotes) * poolWeightMult;

    const dAppState = await api.addresses.data(dApp);

    expect(dAppState).to.include.deep.members([
      {
        key: '%s__currentEpoch',
        type: 'integer',
        value: 1,
      },
      {
        key: `%s%s%s%d__poolShare__${amountAssetId}__${priceAssetId}__0`,
        type: 'integer',
        value: poolShare,
      },
      {
        key: `%s%s%s%s%d__vote__${amountAssetId}__${priceAssetId}__${this.accounts.user1.addr}__0`,
        type: 'integer',
        value: userGwxAmount,
      },
      {
        key: `%s%s%s%s%d__vote__${amountAssetId}__${priceAssetId}__${this.accounts.user1.addr}__1`,
        type: 'integer',
        value: newUserGwxAmount,
      },
    ]);
  });
});
