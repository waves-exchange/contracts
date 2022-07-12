import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, data, nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { BigNumber } from '@waves/bignumber';

chai.use(chaiAsPromised);
const { expect } = chai;

const { waitForTx, waitForHeight } = nodeInteraction;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, votingDuration: number, wxAssetId: string}
 * } MochaSuiteModified
 * */

describe('Voting Verified - Transfer Votes', /** @this {MochaSuiteModified} */() => {
  before(async function () {
    // Constructor
    const { height } = await api.blocks.fetchHeight();
    const invokeTx = invokeScript({
      dApp: address(this.accounts.voting, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.boosting, chainId) }, // boostingContract
          { type: 'string', value: address(this.accounts.emission, chainId) }, // emissionContract
          { type: 'string', value: address(this.accounts.store, chainId) }, // assetsStoreContract
          { type: 'integer', value: 1e8 }, // feeAmount
          { type: 'string', value: this.wxAssetId }, // wxAssetId
          { type: 'integer', value: 1e8 }, // votingThreshold
          { type: 'integer', value: this.votingDuration }, // votingDuration
          { type: 'integer', value: 3 }, // voteBeforeEliminationPrm
          { type: 'integer', value: height }, // startHeight
          { type: 'integer', value: 10 }, // maxDepthPrm
        ],
      },
      chainId,
    }, this.accounts.voting);
    await api.transactions.broadcast(invokeTx, {});
    await waitForTx(invokeTx.id, { apiBase });

    // Issue user tokens
    const userTokens = [];
    await Promise.all(
      Array.from({ length: 3 }).map(async (_, idx) => {
        const issueTx = issue({
          name: `User token #${idx}`,
          description: '',
          quantity: 1e16,
          decimals: 8,
          chainId,
        }, this.accounts[`user${idx}`]);
        userTokens.push(issueTx.id);
        await api.transactions.broadcast(issueTx, {});
        await waitForTx(issueTx.id, { apiBase });
      }),
    );

    // Suggest
    await Promise.all(
      Array.from({ length: 3 }).map(async (_, idx) => {
        const invokeTx2 = invokeScript({
          dApp: address(this.accounts.voting, chainId),
          call: {
            function: 'suggest',
            args: [
              { type: 'string', value: userTokens[idx] }, // assetId
              { type: 'string', value: '' },
            ],
          },
          payment: [
            { amount: 1e8, assetId: this.wxAssetId },
          ],
          chainId,
        }, this.accounts[`user${idx}`]);
        await api.transactions.broadcast(invokeTx2, {});
        await waitForTx(invokeTx2.id, { apiBase });
      }),
    );
  });

  it('Transfer votes, one user and one asset do not pass', async function () {
    const getAssetsHead = async () => {
      const keyAssetsHead = '%s%s__assets__head';
      const { type, value } = await api.addresses
        .fetchDataKey(address(this.accounts.voting, chainId), keyAssetsHead);
      if (type !== 'string') throw new TypeError();
      return value;
    };

    const getAssetsNext = async (assetId) => {
      const keyAssetsNext = `%s%s%s__assets__${assetId}__next`;
      const { type, value } = await api.addresses
        .fetchDataKey(address(this.accounts.voting, chainId), keyAssetsNext);
      if (type !== 'string') throw new TypeError();
      return value;
    };

    const setGwxAmountAndWait = async (/**
                                        @type {{ userAddress: string, amount: number }[]}
                                        */values,
    ) => {
      const setGwxAmountTx = data({
        data: values.map(({ userAddress, amount }) => ({ key: userAddress, type: 'integer', value: amount })),
        chainId,
      }, this.accounts.boosting);
      await api.transactions.broadcast(setGwxAmountTx, {});
      await waitForTx(setGwxAmountTx.id, { apiBase });
    };

    const getCurrentVotingStartHeight = async () => {
      const heightStart = '%s__currentVotingHeightStart';
      const { type, value } = await api.addresses
        .fetchDataKey(address(this.accounts.voting, chainId), heightStart);
      if (type !== 'integer') throw new TypeError();
      return new BigNumber(value).toNumber();
    };

    const getAssetVotingResult = async (asset, period) => {
      const keyVotingResult = `%s%d%s__votingResultAtAsset__${period}__${asset}`;
      const { type, value } = await api.addresses
        .fetchDataKey(address(this.accounts.voting, chainId), keyVotingResult);
      if (type !== 'string') throw new TypeError();
      const [, totalYes, totalNo] = value.split('__');
      return { totalYes, totalNo };
    };

    // Vote
    const assetId0 = await getAssetsHead();
    const assetId1 = await getAssetsNext(assetId0);
    const assetId2 = await getAssetsNext(assetId1);

    await setGwxAmountAndWait([
      { userAddress: address(this.accounts.user0, chainId), amount: 2e8 },
      { userAddress: address(this.accounts.user1, chainId), amount: 1e8 },
      { userAddress: address(this.accounts.user2, chainId), amount: 2e8 },
    ]);

    const voteAndWait = async ({ assetId, inFavor, callerSeed }) => {
      const voteTx = invokeScript({
        dApp: address(this.accounts.voting, chainId),
        call: {
          function: 'vote',
          args: [{ type: 'string', value: assetId }, { type: 'boolean', value: inFavor }],
        },
        payment: [],
        chainId,
      }, callerSeed);
      await api.transactions.broadcast(voteTx, {});
      await waitForTx(voteTx.id, { apiBase });
    };

    // новый пользователь добавляется в начало списка
    // поэтому итоговый порядок обратный
    await voteAndWait({ assetId: assetId0, inFavor: true, callerSeed: this.accounts.user2 });
    await voteAndWait({ assetId: assetId0, inFavor: true, callerSeed: this.accounts.user1 });
    await voteAndWait({ assetId: assetId0, inFavor: true, callerSeed: this.accounts.user0 });
    // третий токен должен пройти
    await voteAndWait({ assetId: assetId2, inFavor: true, callerSeed: this.accounts.user0 });

    // Finalize
    await waitForHeight(await getCurrentVotingStartHeight() + this.votingDuration, { apiBase });
    const finalizeVotingTx = invokeScript({
      dApp: address(this.accounts.voting, chainId),
      call: {
        function: 'finalizeVoting',
        args: [],
      },
      payment: [],
      chainId,
    }, this.accounts.pacemaker);
    await api.transactions.broadcast(finalizeVotingTx, {});
    await waitForTx(finalizeVotingTx.id, { apiBase });

    await setGwxAmountAndWait([
      { userAddress: address(this.accounts.user0, chainId), amount: 1e8 },
      { userAddress: address(this.accounts.user1, chainId), amount: 0 },
      { userAddress: address(this.accounts.user2, chainId), amount: 1e8 },
    ]);

    // Transfer
    await waitForHeight(await getCurrentVotingStartHeight(), { apiBase });
    const transferVotesTx = invokeScript({
      dApp: address(this.accounts.voting, chainId),
      call: {
        function: 'transferVotes',
        args: [],
      },
      payment: [],
      chainId,
    }, this.accounts.pacemaker);
    await api.transactions.broadcast(transferVotesTx, {});
    await waitForTx(transferVotesTx.id, { apiBase });

    // Vote again
    await voteAndWait({ assetId: assetId0, inFavor: true, callerSeed: this.accounts.user2 });

    // Reset transfer
    const resetTransferDataTx = data({
      data: [
        { key: '%s__votesTransferFinished__1' },
      ],
      chainId,
    }, this.accounts.voting);
    await api.transactions.broadcast(resetTransferDataTx, {});
    await waitForTx(resetTransferDataTx.id, { apiBase });

    // Transfer again
    const transferVotesTx1 = invokeScript({
      dApp: address(this.accounts.voting, chainId),
      call: {
        function: 'transferVotes',
        args: [],
      },
      payment: [],
      chainId,
    }, this.accounts.pacemaker);
    await api.transactions.broadcast(transferVotesTx1, {});
    await waitForTx(transferVotesTx1.id, { apiBase });

    const votingResults0 = await Promise.all([assetId0, assetId1, assetId2]
      .map(async (asset) => getAssetVotingResult(asset, 0)));
    const votingResults1 = await Promise.all([assetId0, assetId1, assetId2]
      .map(async (asset) => getAssetVotingResult(asset, 1)));

    expect(votingResults0).to.eql([
      { totalYes: '500000000', totalNo: '0' },
      { totalYes: '0', totalNo: '0' },
      { totalYes: '200000000', totalNo: '0' },
    ]);
    expect(votingResults1).to.eql([
      { totalYes: '200000000', totalNo: '0' },
      { totalYes: '0', totalNo: '0' },
      { totalYes: '100000000', totalNo: '0' },
    ]);
  });
});
