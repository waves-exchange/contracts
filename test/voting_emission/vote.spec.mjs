import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { api } from '../api.mjs';

import {
  votingEmission,
  boostingMock,
  factoryMock,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('voting_emission: vote.spec.mjs', () => {
  const amountAssetId = 'amountAssetId';
  const priceAssetId = 'priceAssetId';
  const epochLength = 2;
  before(async function () {
    const { addr: dApp, seed } = this.accounts.votingEmission;
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
  });

  it('successfull vote', async function () {
    const { addr: dApp } = this.accounts.votingEmission;
    const gwxAmount = 1000;
    const { addr: userAddress, seed: userSeed } = this.accounts.user1;
    const { value: startHeight } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__0');
    const endHeight = startHeight + epochLength;
    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress,
      targetHeight: endHeight,
      amount: gwxAmount,
    });
    const { stateChanges } = await votingEmission.vote({
      dApp, caller: userSeed, amountAssetId, priceAssetId, amount: gwxAmount,
    });
    const epoch = 0;
    const poolString = [amountAssetId, priceAssetId].join('__');

    expect(stateChanges.data).to.eql([
      {
        key: `%s%s%d__used__${userAddress}__${epoch}`,
        type: 'integer',
        value: gwxAmount,
      },
      {
        key: `%s%s%s%s%d__vote__${poolString}__${userAddress}__${epoch}`,
        type: 'integer',
        value: gwxAmount,
      },
      {
        key: `%s%s%s%d__votingResult__${poolString}__${epoch}`,
        type: 'integer',
        value: gwxAmount,
      },
      { key: `%s%d__totalVotes__${epoch}`, type: 'integer', value: gwxAmount },
      {
        key: `%s%s%s%s__votes__${poolString}__size`,
        type: 'integer',
        value: 1,
      },
      {
        key: `%s%s%s%s__votes__${poolString}__head`,
        type: 'string',
        value: `${userAddress}`,
      },
    ]);
  });
});
