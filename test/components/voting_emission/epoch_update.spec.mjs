import { data } from '@waves/waves-transactions';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  api, broadcastAndWait, waitForHeight, chainId,
} from '../../utils/api.mjs';

import {
  votingEmission,
  boostingMock,
  factoryMock,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: voting_emission: update epoch`, () => {
  const amountAssetId1 = 'amountAssetId1';
  const amountAssetId1Internal = 0;
  const priceAssetId1 = 'priceAssetId1';
  const priceAssetId1Internal = 1;
  const epochLength = 2;
  const epochLengthNew = 1;
  const poolContract1 = 'poolContract1';
  const poolLpAssetId1 = 'poolLpAssetId1';
  before(async function () {
    const { addr: dApp, seed } = this.accounts.votingEmission;
    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__mappings__baseAsset2internalId__${amountAssetId1}`, type: 'integer', value: amountAssetId1Internal },
        { key: `%s%s%s__mappings__baseAsset2internalId__${priceAssetId1}`, type: 'integer', value: priceAssetId1Internal },
        { key: `%d%d%s%s__${amountAssetId1Internal}__${priceAssetId1Internal}__mappings__poolAssets2PoolContract`, type: 'string', value: poolContract1 },
        { key: `%s%s%s__${poolContract1}__mappings__poolContract2LpAsset`, type: 'string', value: poolLpAssetId1 },
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
      amountAssetId: amountAssetId1,
      priceAssetId: priceAssetId1,
    });
    await votingEmission.create({
      dApp,
      caller: seed,
      amountAssetId: amountAssetId1,
      priceAssetId: priceAssetId1,
    });
  });

  it('successfull update epoch', async function () {
    const { addr: dApp } = this.accounts.votingEmission;

    const { value: startHeight0 } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__0');
    const endHeight0 = startHeight0 + epochLength;

    const userGwxAmount0 = 1000;

    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user1.addr,
      targetHeight: endHeight0,
      amount: userGwxAmount0,
    });

    await votingEmission.vote({
      dApp,
      caller: this.accounts.user1.seed,
      amountAssetId: amountAssetId1,
      priceAssetId: priceAssetId1,
      amount: userGwxAmount0,
    });

    const startHeight1 = endHeight0 + 1;
    const endHeight1 = startHeight1 + epochLength;
    await waitForHeight(startHeight1);

    const userGwxAmount1 = 500;

    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user1.addr,
      targetHeight: endHeight1,
      amount: userGwxAmount1,
    });

    await votingEmission.finalize({
      dApp, caller: this.accounts.pacemaker.seed,
    });

    await votingEmission.setEpochLength({
      dApp, caller: this.accounts.votingEmission.seed, value: epochLengthNew,
    });

    const startHeight2 = endHeight1 + 1;
    const endHeight2 = startHeight2 + epochLengthNew;
    await waitForHeight(startHeight2);

    const userGwxAmount2 = 250;

    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user1.addr,
      targetHeight: endHeight2,
      amount: userGwxAmount2,
    });

    await votingEmission.finalize({
      dApp, caller: this.accounts.pacemaker.seed,
    });

    const dAppState = await api.addresses.data(dApp);

    expect(dAppState).to.include.deep.members([
      {
        key: '%s%d__totalVotes__0',
        type: 'integer',
        value: userGwxAmount0,
      },
      {
        key: '%s%d__totalVotes__1',
        type: 'integer',
        value: userGwxAmount1,
      },
      {
        key: '%s%d__totalVotes__2',
        type: 'integer',
        value: userGwxAmount2,
      },
    ]);
  });
});
