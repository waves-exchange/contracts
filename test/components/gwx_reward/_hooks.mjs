import {
  address, privateKey, publicKey, random,
} from '@waves/ts-lib-crypto';
import {
  massTransfer, issue,
} from '@waves/waves-transactions';
import { table, getBorderCharacters } from 'table';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { broadcastAndWait, chainId, baseSeed } from '../../utils/api.mjs';
import { gwxReward } from './contract/gwxReward.mjs';
import { emission } from './contract/emission.mjs';

const nonceLength = 3;

const ridePath = '../ride';
const gwxPath = format({ dir: ridePath, base: 'gwx_reward.ride' });
const emissionPath = format({ dir: ridePath, base: 'emission.ride' });

export const mochaHooks = {
  async beforeAll() {
    const nonce = random(nonceLength, 'Buffer').toString('hex');
    // setup accounts
    const contractNames = [
      'gwxReward',
      'emission',
    ];
    const userNames = Array.from({ length: 3 }, (_, k) => `user${k}`);
    const names = [...contractNames, ...userNames, 'pacemaker'];
    this.accounts = Object.fromEntries(names.map((item) => {
      const seed = `${item}#${nonce}`;
      return [item, { seed, addr: address(seed, chainId), publicKey: publicKey(seed) }];
    }));
    const amount = 1e10;
    const massTransferTx = massTransfer({
      transfers: Object.values(this.accounts)
        .map(({ addr: recipient }) => ({ recipient, amount })),
      chainId,
    }, baseSeed);
    await broadcastAndWait(massTransferTx);

    const wxIssueTx = issue({
      name: 'WX Token',
      description: '',
      quantity: 1e10 * 1e8,
      decimals: 8,
      chainId,
    }, this.accounts.emission.seed);
    await broadcastAndWait(wxIssueTx);
    this.wxAssetId = wxIssueTx.id;

    const wxAmount = 1e16;
    const massTransferTxWX = massTransfer({
      transfers: names.map((name) => ({
        recipient: address(this.accounts[name], chainId), amount: wxAmount,
      })),
      assetId: this.wxAssetId,
      chainId,
    }, this.accounts.emission.seed);
    await broadcastAndWait(massTransferTxWX);

    this.wavesAssetId = 'WAVES';

    await setScriptFromFile(gwxPath, this.accounts.gwxReward.seed);
    await setScriptFromFile(emissionPath, this.accounts.emission.seed);

    const emissionConfig = `%s__${this.wxAssetId}`;

    await emission.init({
      caller: this.accounts.emission.seed,
      config: emissionConfig,
    });

    await gwxReward.init({
      caller: this.accounts.gwxReward.seed,
      emissionAddress: this.accounts.emission.addr,
      wxAssetId: this.wxAssetId,
      maxRecipients: 90,
    });

    const accountsInfo = Object.entries(this.accounts)
      .map(([name, { seed, addr }]) => [name, seed, privateKey(seed), addr]);
    console.log(table(accountsInfo, {
      border: getBorderCharacters('norc'),
      drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
      header: { content: `pid = ${process.pid}, nonce = ${nonce}` },
    }));
  },
};
