import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import { api, waitForTx, chainId } from '../../utils/api.mjs';

import {
  votingEmission,
  factoryMock,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: voting_emission: deletePool`, () => {
  const amountAssetId = 'amountAssetId';
  const priceAssetId = 'priceAssetId';
  const epochLength = 4;
  before(async function () {
    const { addr: dApp, seed } = this.accounts.votingEmission;
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

  it('should delete keys and pool from `pools` list', async function () {
    const deletePoolInvokeTx = invokeScript({
      dApp: this.accounts.votingEmission.addr,
      call: {
        function: 'deletePool',
        args: [
          { type: 'string', value: amountAssetId },
          { type: 'string', value: priceAssetId },
        ],
      },
      additionalFee: 4e5,
      chainId,
    }, this.accounts.votingEmission.seed);

    await api.transactions.broadcast(deletePoolInvokeTx, {});
    const { stateChanges } = await waitForTx(deletePoolInvokeTx.id, { chainId });

    expect(stateChanges.data).to.deep.eql([
      { key: '%s%s%s__inList__amountAssetId__priceAssetId', value: null },
      { key: '%s%s__pools__size', type: 'integer', value: 0 },
      { key: '%s%s__pools__head', value: null },
    ]);
  });
});
