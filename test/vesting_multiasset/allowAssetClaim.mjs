import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { waitForHeight } from '../api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, votingDuration: number, wxAssetId: string}
 * } MochaSuiteModified
 * */
describe('vesting_multiasset: allowAssetClaim.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully createDepositFor and allowAssetClaim', async function () {
    const vesting = address(this.accounts.vesting_multiasset, chainId);
    const user1 = address(this.accounts.user1, chainId);

    const createDepositFor = invokeScript({
      dApp: vesting,
      payment: [{
        assetId: this.wxAssetId,
        amount: 10000,
      }],
      call: {
        function: 'createDepositFor',
        args: [
          { type: 'string', value: user1 },
          { type: 'integer', value: 5000 },
        ],
      },
      chainId,
    }, this.accounts.user3);
    await api.transactions.broadcast(createDepositFor, {});
    const minedCreateDepositFor = await ni.waitForTx(createDepositFor.id, { apiBase });

    await waitForHeight(minedCreateDepositFor.height + 3);

    await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);
    const claim = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(claim, {});
    await ni.waitForTx(claim.id, { apiBase });
    await api.assets.fetchBalanceAddressAssetId(user1, this.wxAssetId);

    const denyAssetClaim = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'denyAssetClaim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.admin);
    await api.transactions.broadcast(denyAssetClaim, {});
    await ni.waitForTx(denyAssetClaim.id, { apiBase });

    const claim2 = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.user1);
    await expect(api.transactions.broadcast(claim2, {})).to.be
      .rejectedWith('Error while executing account-script: vesting_multiasset.ride: asset claim denied');

    const allowAssetClaim = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'allowAssetClaim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.admin);
    await api.transactions.broadcast(allowAssetClaim, {});
    await ni.waitForTx(allowAssetClaim.id, { apiBase });
    const currentHeight = await api.blocks.fetchHeight();

    await waitForHeight(currentHeight.height + 1);

    const claim3 = invokeScript({
      dApp: vesting,
      payment: [],
      call: {
        function: 'claim',
        args: [{ type: 'string', value: this.wxAssetId }],
      },
      chainId,
    }, this.accounts.user1);
    let claim3Ok;
    try {
      await api.transactions.broadcast(claim3, {});
      claim3Ok = true;
    } catch {
      claim3Ok = false;
    }
    expect(claim3Ok).equal(true);
  });
});
