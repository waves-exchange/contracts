import { data } from '@waves/waves-transactions';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  api, broadcastAndWait, waitForHeight, chainId,
} from '../../utils/api.mjs';

import {
  votingEmission,
  factoryMock,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: voting_emission: finalize: pool removal`, () => {
  const amountAssetId1 = 'amountAssetId1';
  const amountAssetId1Internal = 0;
  const priceAssetId1 = 'priceAssetId1';
  const priceAssetId1Internal = 1;
  const amountAssetId2 = 'amountAssetId2';
  const amountAssetId2Internal = 2;
  const priceAssetId2 = 'priceAssetId2';
  const priceAssetId2Internal = 3;
  const epochLength = 4;
  const poolContract1 = 'poolContract1';
  const poolContract2 = 'poolContract2';
  const poolLpAssetId1 = 'poolLpAssetId1';
  const poolLpAssetId2 = 'poolLpAssetId2';
  before(async function () {
    const { addr: dApp, seed } = this.accounts.votingEmission;
    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__mappings__baseAsset2internalId__${amountAssetId1}`, type: 'integer', value: amountAssetId1Internal },
        { key: `%s%s%s__mappings__baseAsset2internalId__${priceAssetId1}`, type: 'integer', value: priceAssetId1Internal },
        { key: `%d%d%s%s__${amountAssetId1Internal}__${priceAssetId1Internal}__mappings__poolAssets2PoolContract`, type: 'string', value: poolContract1 },
        { key: `%s%s%s__${poolContract1}__mappings__poolContract2LpAsset`, type: 'string', value: poolLpAssetId1 },
        { key: `%s%s%s__mappings__baseAsset2internalId__${amountAssetId2}`, type: 'integer', value: amountAssetId2Internal },
        { key: `%s%s%s__mappings__baseAsset2internalId__${priceAssetId2}`, type: 'integer', value: priceAssetId2Internal },
        { key: `%d%d%s%s__${amountAssetId2Internal}__${priceAssetId2Internal}__mappings__poolAssets2PoolContract`, type: 'string', value: poolContract2 },
        { key: `%s%s%s__${poolContract2}__mappings__poolContract2LpAsset`, type: 'string', value: poolLpAssetId2 },
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
      votingEmissionRate: this.accounts.votingEmissionRate.addr,
      epochLength,
    });
    await factoryMock.setWxEmissionPoolLabel({
      dApp: this.accounts.factory.addr,
      caller: this.accounts.factory.seed,
      amountAssetId: amountAssetId1,
      priceAssetId: priceAssetId1,
    });
    await votingEmission.create({
      dApp,
      caller: seed,
      amountAssetId: amountAssetId1,
      priceAssetId: priceAssetId1,
    });
    // this pool will be removed due to lack of wx emission label
    await votingEmission.create({
      dApp,
      caller: seed,
      amountAssetId: amountAssetId2,
      priceAssetId: priceAssetId2,
    });
  });

  it('the pool following the removed one must be processed', async function () {
    const { addr: dApp } = this.accounts.votingEmission;
    const { value: startHeight } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__0');
    await waitForHeight(startHeight + epochLength);
    await votingEmission.finalize({
      dApp, caller: this.accounts.pacemaker.seed,
    });

    const dAppState = await api.addresses.data(dApp);

    const targetEpoch = 0;
    expect(dAppState).to.include.deep.members([
      {
        key: `%s%s%s%d__poolShare__${amountAssetId1}__${priceAssetId1}__${targetEpoch}`,
        type: 'integer',
        value: 0,
      },
    ]);
  });
});
