import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data } from '@waves/waves-transactions';
import {
  api, broadcastAndWait, chainId, waitForHeight,
} from '../../utils/api.mjs';
import { proposal } from './contract/proposal.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: proposal: active voting list`, () => {
  let startHeight;
  it('list should be updated after vote creation', async function () {
    const keyActiveVotingList = '%s__activeVotingList';
    const duration = 60;
    const quorumNumber = 1e8;
    [{ height: startHeight }] = await Promise.all([
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
        duration: 1,
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

    expect(
      await api.addresses.fetchDataKey(
        this.accounts.proposal.address,
        keyActiveVotingList,
      ).then(({ value }) => value),
    ).to.equal('2__1__0');
  });

  it('list should be updated when voting is over', async function () {
    await waitForHeight(startHeight + 2);
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

    const { stateChanges } = await proposal.voteFor({
      dApp: this.accounts.proposal.address,
      caller: this.accounts.user0.seed,
      proposalIndex: 0,
      choice: true,
    });

    expect(stateChanges.data).to.deep.include({
      key: '%s__activeVotingList',
      type: 'string',
      value: '2__0',
    });
  });
});
