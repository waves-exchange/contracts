import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const api = create(apiBase);
const chainId = 'R';

describe('otc_multiasset: withdrawFee.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject withdrawFee', async function () {
    const toWithdrawA = 123;
    const toWithdrawB = 345;

    const expectedTotalCommissionsCollectedDeposit = 0;
    const expectedTotalCommissionsCollectedWithdraw = 0;

    const setTotalCommissionsCollectedDepositTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s%s__totalCommissionsCollected__deposit__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: toWithdrawA,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setTotalCommissionsCollectedDepositTx, {});
    await ni.waitForTx(setTotalCommissionsCollectedDepositTx.id, { apiBase });

    const setTotalCommissionsCollectedWithdrawTx = data({
      additionalFee: 4e5,
      senderPublicKey: publicKey(this.accounts.otcMultiasset),
      data: [{
        key: `%s%s%s%s__totalCommissionsCollected__withdraw__${this.assetAId}__${this.assetBId}`,
        type: 'integer',
        value: toWithdrawB,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setTotalCommissionsCollectedWithdrawTx, {});
    await ni.waitForTx(setTotalCommissionsCollectedWithdrawTx.id, { apiBase });

    const withdrawFeeTx = invokeScript({
      dApp: address(this.accounts.otcMultiasset, chainId),
      payment: [],
      call: {
        function: 'withdrawFee',
        args: [
          { type: 'string', value: this.assetAId },
          { type: 'string', value: this.assetBId },
        ],
      },
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(withdrawFeeTx, {});
    const { stateChanges } = await ni.waitForTx(withdrawFeeTx.id, { apiBase });

    expect(await checkStateChanges(stateChanges, 2, 2, 0, 0, 0, 0, 0, 0, 0)).to.eql(true);

    expect(stateChanges.data).to.eql([{
      key: `%s%s%s%s__totalCommissionsCollected__deposit__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: expectedTotalCommissionsCollectedDeposit,
    }, {
      key: `%s%s%s%s__totalCommissionsCollected__withdraw__${this.assetAId}__${this.assetBId}`,
      type: 'integer',
      value: expectedTotalCommissionsCollectedWithdraw,
    }]);

    expect(stateChanges.transfers).to.eql([{
      address: address(this.accounts.manager, chainId),
      asset: this.assetAId,
      amount: toWithdrawA,
    }, {
      address: address(this.accounts.manager, chainId),
      asset: this.assetBId,
      amount: toWithdrawB,
    }]);
  });
});
