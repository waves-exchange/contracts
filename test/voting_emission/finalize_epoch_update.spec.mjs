import { data } from '@waves/waves-transactions';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  api, broadcastAndWait, waitForHeight, chainId,
} from '../api.mjs';

import {
  votingEmission,
  factoryMock,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: voting_emission: finalize: epoch update`, () => {
  const amountAssetId = 'amountAssetId';
  const amountAssetIdInternal = 0;
  const priceAssetId = 'priceAssetId';
  const priceAssetIdInternal = 1;
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
  });

  it('epoch should not increment if finalization is not over yet', async function () {
    const { addr: dApp } = this.accounts.votingEmission;
    const { value: startHeight0 } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__0');
    await waitForHeight(startHeight0 + epochLength);
    await votingEmission.finalizeHelper({
      dApp, caller: this.accounts.pacemaker.seed,
    });
    const { value: startHeight1 } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__1');
    await waitForHeight(startHeight1 + epochLength);
    await votingEmission.finalizeHelper({
      dApp, caller: this.accounts.pacemaker.seed,
    });

    const dAppState = await api.addresses.data(dApp);

    expect(dAppState).to.deep.include.members([
      {
        key: '%s__currentEpoch',
        type: 'integer',
        value: 1,
      },
    ]);
  });
});
