import wc from '@waves/ts-lib-crypto';
import {
  massTransfer, data,
} from '@waves/waves-transactions';
import { table, getBorderCharacters } from 'table';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { broadcastAndWait, chainId, baseSeed } from '../../utils/api.mjs';

const nonceLength = 3;

const ridePath = '../ride';
const mockPath = './components/proposal/mock';
const gwxRewardMockPath = format({ dir: mockPath, base: 'gwx_reward.mock.ride' });
const proposalPath = format({ dir: ridePath, base: 'proposal.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = wc.random(nonceLength, 'Buffer').toString('hex');
    const contractNames = [
      'gwxReward',
      'proposal',
    ];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
    this.accounts = Object.fromEntries(names.map((item) => {
      const seed = `${item}#${nonce}`;
      return [item, { seed, address: wc.address(seed, chainId), publicKey: wc.publicKey(seed) }];
    }));
    const amount = 1e10;
    await broadcastAndWait(massTransfer({
      transfers: Object.values(this.accounts)
        .map(({ address: recipient }) => ({ recipient, amount })),
      chainId,
    }, baseSeed));

    await broadcastAndWait(data({
      data: [
        { key: '%s__currentIndex', type: 'integer', value: 0 },
        { key: '%s__gwxContractAddress', type: 'string', value: this.accounts.gwxReward.address },
      ],
      chainId,
    }, this.accounts.proposal.seed));

    await Promise.all([
      setScriptFromFile(gwxRewardMockPath, this.accounts.gwxReward.seed),
      setScriptFromFile(proposalPath, this.accounts.proposal.seed),
    ]);

    const accountsInfo = Object.entries(this.accounts)
      .map(([name, { seed, address }]) => [name, seed, wc.privateKey(seed), address]);
    console.log(table(accountsInfo, {
      border: getBorderCharacters('norc'),
      drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
      header: { content: `pid = ${process.pid}, nonce = ${nonce}` },
    }));
  },
};
