import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  votingEmission,
} from './callables.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: voting_emission: create`, () => {
  // before(async () => {
  //   await votingEmission.init();
  // });

  it('successfull create', async function () {
    const { addr, seed } = this.accounts.votingEmission;
    const amountAssetId = 'amountAssetId';
    const priceAssetId = 'priceAssetId';
    const { stateChanges, height } = await votingEmission.create({
      dApp: addr, caller: seed, amountAssetId, priceAssetId,
    });

    expect(stateChanges.data).to.include.deep.members([
      {
        key: `%s%s%s__inList__${amountAssetId}__${priceAssetId}`,
        type: 'boolean',
        value: true,
      },
      { key: '%s%s__pools__size', type: 'integer', value: 1 },
      {
        key: '%s%s__pools__head',
        type: 'string',
        value: `${amountAssetId}__${priceAssetId}`,
      },
      { key: '%s__currentEpoch', type: 'integer', value: 0 },
      { key: '%s%d__startHeight__0', type: 'integer', value: height },
    ]);
  });
});
