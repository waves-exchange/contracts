import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { proposal } from './contract/proposal.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: proposal: start new vote`, () => {
  it('new vote should be created', async function () {
    const duration = 60;
    const quorumNumber = 1e8;

    return expect(proposal.startNewVote({
      dApp: this.accounts.proposal.address,
      caller: this.accounts.proposal.seed,
      name: 'test1',
      description: 'test1',
      duration,
      quorumNumber,
    })).to.be.fulfilled;
  });
});
