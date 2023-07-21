import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data } from '@waves/waves-transactions';
import { api, broadcastAndWait, chainId } from '../../utils/api.mjs';
import { proposal } from './contract/proposal.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: proposal`, () => {
  it('get locked gwx amount should work', async function () {
    const duration = 60;
    const quorumNumber = 1e8;
    await Promise.all([
      proposal.startNewVote({
        dApp: this.accounts.proposal.address,
        caller: this.accounts.proposal.seed,
        name: 'test1',
        description: 'test1',
        duration,
        quorumNumber,
      }),
      proposal.startNewVote({
        dApp: this.accounts.proposal.address,
        caller: this.accounts.proposal.seed,
        name: 'test2',
        description: 'test2',
        duration,
        quorumNumber,
      }),
      proposal.startNewVote({
        dApp: this.accounts.proposal.address,
        caller: this.accounts.proposal.seed,
        name: 'test3',
        description: 'test3',
        duration,
        quorumNumber,
      }),
    ]);

    const vote1 = 1e8;
    await broadcastAndWait(data({
      data: [
        {
          key: `%s%s__gwxAmountTotal__${this.accounts.user0.address}`,
          value: vote1,
        },
      ],
      chainId,
    }, this.accounts.gwxReward.seed));

    await proposal.voteFor({
      dApp: this.accounts.proposal.address,
      caller: this.accounts.user0.seed,
      proposalIndex: 0,
      choice: true,
    });

    const vote2 = 2e8;
    await broadcastAndWait(data({
      data: [
        {
          key: `%s%s__gwxAmountTotal__${this.accounts.user0.address}`,
          value: vote2,
        },
      ],
      chainId,
    }, this.accounts.gwxReward.seed));

    await proposal.voteFor({
      dApp: this.accounts.proposal.address,
      caller: this.accounts.user0.seed,
      proposalIndex: 2,
      choice: true,
    });

    const expr = `getLockedGwxAmount("${this.accounts.user0.address}")`;
    const response = await api.utils.fetchEvaluate(
      this.accounts.proposal.address,
      expr,
    );
    const result = response.result.value._2.value;

    expect(result).to.equal(Math.max(vote1, vote2));
  });
});
