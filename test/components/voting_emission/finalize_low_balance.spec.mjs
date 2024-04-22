import { data, issue } from '@waves/waves-transactions';
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

describe(`${process.pid}: voting_emission: finalize (low balance)`, () => {
  let amountAssetId1;
  const amountAssetId1Internal = 0;
  let priceAssetId1;
  const priceAssetId1Internal = 1;
  let amountAssetId2;
  const amountAssetId2Internal = 2;
  let priceAssetId2;
  const priceAssetId2Internal = 3;
  const user1GwxAmount = 1000;
  const user2GwxAmount = 3000;
  const epochLength = 6;
  let poolLpAssetId1;
  let poolLpAssetId2;
  before(async function () {
    [
      { id: amountAssetId1 },
      { id: priceAssetId1 },
      { id: amountAssetId2 },
      { id: priceAssetId2 },
      { id: poolLpAssetId1 },
      { id: poolLpAssetId2 },
    ] = await Promise.all([
      broadcastAndWait(issue({
        name: 'amountAssetId1', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
      }, this.accounts.factory.seed)),
      broadcastAndWait(issue({
        name: 'priceAssetId1', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
      }, this.accounts.factory.seed)),
      broadcastAndWait(issue({
        name: 'amountAssetId2', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
      }, this.accounts.factory.seed)),
      broadcastAndWait(issue({
        name: 'priceAssetId2', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
      }, this.accounts.factory.seed)),
      broadcastAndWait(issue({
        name: 'poolLpAssetId1', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
      }, this.accounts.factory.seed)),
      broadcastAndWait(issue({
        name: 'poolLpAssetId2', description: '', quantity: 1e6 * 1e8, decimals: 8, reissuable: true, chainId,
      }, this.accounts.factory.seed)),
    ]);
    const { addr: dApp, seed } = this.accounts.votingEmission;
    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__mappings__baseAsset2internalId__${amountAssetId1}`, type: 'integer', value: amountAssetId1Internal },
        { key: `%s%s%s__mappings__baseAsset2internalId__${priceAssetId1}`, type: 'integer', value: priceAssetId1Internal },
        { key: `%d%d%s%s__${amountAssetId1Internal}__${priceAssetId1Internal}__mappings__poolAssets2PoolContract`, type: 'string', value: this.accounts.pool1.addr },
        { key: `%s%s%s__${this.accounts.pool1.addr}__mappings__poolContract2LpAsset`, type: 'string', value: poolLpAssetId1 },
        { key: `%s%s%s__mappings__baseAsset2internalId__${amountAssetId2}`, type: 'integer', value: amountAssetId2Internal },
        { key: `%s%s%s__mappings__baseAsset2internalId__${priceAssetId2}`, type: 'integer', value: priceAssetId2Internal },
        { key: `%d%d%s%s__${amountAssetId2Internal}__${priceAssetId2Internal}__mappings__poolAssets2PoolContract`, type: 'string', value: this.accounts.pool2.addr },
        { key: `%s%s%s__${this.accounts.pool2.addr}__mappings__poolContract2LpAsset`, type: 'string', value: poolLpAssetId2 },
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
    const { value: startHeight } = await api.addresses.fetchDataKey(dApp, '%s%d__startHeight__0');
    const endHeight = startHeight + epochLength;
    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user1.addr,
      targetHeight: endHeight,
      amount: user1GwxAmount,
    });
    await votingEmission.vote({
      dApp,
      caller: this.accounts.user1.seed,
      amountAssetId: amountAssetId1,
      priceAssetId: priceAssetId1,
      amount: user1GwxAmount,
    });
    await factoryMock.setWxEmissionPoolLabel({
      dApp: this.accounts.factory.addr,
      caller: this.accounts.factory.seed,
      amountAssetId: amountAssetId2,
      priceAssetId: priceAssetId2,
    });
    await votingEmission.create({
      dApp,
      caller: seed,
      amountAssetId: amountAssetId2,
      priceAssetId: priceAssetId2,
    });
    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user2.addr,
      targetHeight: endHeight,
      amount: user2GwxAmount,
    });
    await votingEmission.vote({
      dApp,
      caller: this.accounts.user2.seed,
      amountAssetId: amountAssetId2,
      priceAssetId: priceAssetId2,
      amount: user2GwxAmount,
    });
    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user1.addr,
      targetHeight: endHeight + epochLength,
      amount: user1GwxAmount / 2,
    });
    await boostingMock.setUserGwxAmountAtHeight({
      dApp: this.accounts.boosting.addr,
      caller: this.accounts.boosting.seed,
      userAddress: this.accounts.user2.addr,
      targetHeight: endHeight + epochLength,
      amount: user2GwxAmount / 2,
    });
  });

  it('successfull finalize', async function () {
    const epoch = 0;
    await broadcastAndWait(data({
      data: [
        { key: `checkBalanceResult__${poolLpAssetId2}`, type: 'boolean', value: false },
      ],
      additionalFee: 4e5,
      chainId,
    }, this.accounts.factory.seed));
    const { addr: dApp } = this.accounts.votingEmission;
    const { value: startHeight } = await api.addresses.fetchDataKey(dApp, `%s%d__startHeight__${epoch}`);
    await waitForHeight(startHeight + epochLength + 1);
    await votingEmission.setMaxDepth({
      dApp, caller: this.accounts.votingEmission.seed, value: 20,
    });
    await votingEmission.finalize({
      dApp, caller: this.accounts.pacemaker.seed,
    });
    const poolWeightMult = 1e8;
    const totalVotes = user1GwxAmount + user2GwxAmount;
    const pool1Share = (user1GwxAmount / totalVotes) * poolWeightMult;
    const pool2Share = 0;

    const dAppState = await api.addresses.data(dApp);
    const dAppStateMap = Object.fromEntries(dAppState.map((v) => [v.key, v]));

    expect(dAppStateMap['%s__currentEpoch'].value).to.equal(epoch + 1);
    expect(dAppStateMap[`%s%s%s%d__poolShare__${amountAssetId1}__${priceAssetId1}__${epoch}`].value).to.equal(pool1Share);
    expect(dAppStateMap[`%s%s%s%d__poolShare__${amountAssetId2}__${priceAssetId2}__${epoch}`].value).to.equal(pool2Share);
  });
});
