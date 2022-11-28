import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { checkStateChanges, setScriptFromFile } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';
const api = create(apiBase);
const ridePath = join('components', 'lp_stable', 'ride');
const dAppUserPath = format({ dir: ridePath, base: 'dAppUser.ride' });

describe('dAppUser: putOneTknV2AndGetOneTknV2.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully putOneTknV2AndGetOneTknV2', async function () {
    const dAppUser = this.accounts.user3;
    await setScriptFromFile(dAppUserPath, dAppUser);

    const depositAmount = 15000e6;
    const lpStable = address(this.accounts.lpStable, chainId);

    const usdtAmount = 10e6;
    const usdnAmount = 25e6;
    const shouldAutoStake = false;

    const put = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
        { assetId: this.usdnAssetId, amount: usdnAmount },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: shouldAutoStake },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(put, {});
    await ni.waitForTx(put.id, { apiBase });

    const putAndGetOneTkn = invokeScript({
      dApp: address(dAppUser, chainId),
      payment: [
        { assetId: this.usdnAssetId, amount: depositAmount },
      ],
      call: {
        function: 'putOneTknV2AndGetOneTknV2',
        args: [
          { type: 'string', value: lpStable },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putAndGetOneTkn, {});
    const {
      height, stateChanges, id, payment,
    } = await ni.waitForTx(putAndGetOneTkn.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);

    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    const expectedLpAmount = 592002068703;
    const expectedPriceLastPutOneTknV2 = 150100000000;
    const expectedPriceHistoryPutOneTknV2 = 150100000000;
    const expectedFeeAmountPutOneTknV2 = 15000000;
    const expectedUsdnAmountGetOneTknV2 = 14970015000;
    const expectedPriceLastGetOneTknV2 = 250000010;
    const expectedPriceHistoryGetOneTknV2 = 250000010;
    const expectedFeeAmountGetOneTknV2 = 14984999;
    const expectedInvokesCount = 2;
    const expectedMinAmout = 0;
    const expectedAutoStake = false;

    expect(payment).to.eql([{
      amount: depositAmount,
      assetId: this.usdnAssetId,
    }]);

    expect(
      await checkStateChanges(stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 2),
    ).to.eql(true);

    const { invokes } = stateChanges;
    expect(invokes.length).to.eql(expectedInvokesCount);

    const invokePutOneTknV2 = invokes[0];
    const invokeGetOneTknV2 = invokes[1];

    // invoke 0 putOneTknV2
    // ___________________________________________________________________________________________

    expect(
      await checkStateChanges(invokePutOneTknV2.stateChanges, 3, 2, 0, 0, 0, 0, 0, 0, 2),
    ).to.eql(true);

    expect(invokePutOneTknV2.dApp).to.eql(lpStable);
    expect(invokePutOneTknV2.call.function).to.eql('putOneTknV2');
    expect(invokePutOneTknV2.call.args).to.eql([
      {
        type: 'Int',
        value: expectedMinAmout,
      }, {
        type: 'Boolean',
        value: expectedAutoStake,
      }]);
    expect(invokePutOneTknV2.payment).to.eql([{
      amount: depositAmount,
      assetId: this.usdnAssetId,
    }]);

    expect(invokePutOneTknV2.stateChanges.data).to.eql([{
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLastPutOneTknV2,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistoryPutOneTknV2,
    }, {
      key: `%s%s%s__P__${address(dAppUser, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__0__${depositAmount}__${expectedLpAmount}__${expectedPriceLastPutOneTknV2}__0__0__${height}__${timestamp}__0__0`,
    }]);

    expect(invokePutOneTknV2.stateChanges.transfers).to.eql([{
      address: address(dAppUser, chainId),
      asset: this.lpStableAssetId,
      amount: expectedLpAmount,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.usdnAssetId,
      amount: expectedFeeAmountPutOneTknV2,
    }]);

    const { invokes: invokePutOneTknV2Invokes } = invokePutOneTknV2.stateChanges;
    expect(invokePutOneTknV2Invokes.length).to.eql(2);

    expect(
      await checkStateChanges(
        invokePutOneTknV2Invokes[0].stateChanges,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ),
    ).to.eql(true);

    expect(invokePutOneTknV2Invokes[0].dApp)
      .to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokePutOneTknV2Invokes[0].call.function)
      .to.eql('isPoolOneTokenOperationsDisabledREADONLY');
    expect(invokePutOneTknV2Invokes[0].call.args).to.eql([
      {
        type: 'String',
        value: lpStable,
      }]);
    expect(invokePutOneTknV2Invokes[0].payment).to.eql([]);

    expect(
      await checkStateChanges(
        invokePutOneTknV2Invokes[1].stateChanges,
        0,
        1,
        0,
        1,
        0,
        0,
        0,
        0,
        0,
      ),
    ).to.eql(true);

    expect(invokePutOneTknV2Invokes[1].dApp)
      .to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokePutOneTknV2Invokes[1].call.function).to.eql('emit');
    expect(invokePutOneTknV2Invokes[1].call.args).to.eql([
      {
        type: 'Int',
        value: expectedLpAmount,
      }]);
    expect(invokePutOneTknV2Invokes[1].payment).to.eql([]);
    expect(invokePutOneTknV2Invokes[1].stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.lpStable, chainId),
        asset: this.lpStableAssetId,
        amount: expectedLpAmount,
      }]);
    expect(invokePutOneTknV2Invokes[1].stateChanges.reissues).to.eql([{
      assetId: this.lpStableAssetId,
      isReissuable: true,
      quantity: expectedLpAmount,
    }]);

    // invoke 3 getOneTknV2
    // ___________________________________________________________________________________________

    expect(
      await checkStateChanges(
        invokeGetOneTknV2.stateChanges,
        3,
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        3,
      ),
    ).to.eql(true);

    expect(invokeGetOneTknV2.stateChanges.data).to.eql([{
      key: `%s%s%s__G__${address(dAppUser, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d__0__${expectedUsdnAmountGetOneTknV2}__${expectedLpAmount}__${expectedPriceLastGetOneTknV2}__${height}__${timestamp}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLastGetOneTknV2,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistoryGetOneTknV2,
    }]);

    expect(invokeGetOneTknV2.stateChanges.transfers).to.eql([{
      address: address(dAppUser, chainId),
      asset: this.usdnAssetId,
      amount: expectedUsdnAmountGetOneTknV2,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.usdnAssetId,
      amount: expectedFeeAmountGetOneTknV2,
    }]);

    const { invokes: invokeGetOneTknV2Invokes } = invokeGetOneTknV2.stateChanges;
    expect(invokeGetOneTknV2Invokes.length).to.eql(3);

    expect(
      await checkStateChanges(
        invokeGetOneTknV2Invokes[0].stateChanges,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ),
    ).to.eql(true);

    expect(invokeGetOneTknV2Invokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokeGetOneTknV2Invokes[0].call.function).to.eql('isPoolOneTokenOperationsDisabledREADONLY');
    expect(invokeGetOneTknV2Invokes[0].call.args).to.eql([
      {
        type: 'String',
        value: lpStable,
      }]);
    expect(invokeGetOneTknV2Invokes[0].payment).to.eql([]);

    expect(
      await checkStateChanges(
        invokeGetOneTknV2Invokes[1].stateChanges,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ),
    ).to.eql(true);

    expect(invokeGetOneTknV2Invokes[1].dApp).to.eql(address(this.accounts.lpStable, chainId));
    expect(invokeGetOneTknV2Invokes[1].call.function).to.eql('getOneTknV2READONLY');
    expect(invokeGetOneTknV2Invokes[1].call.args).to.eql([
      {
        type: 'String',
        value: this.usdnAssetId,
      }, {
        type: 'Int',
        value: expectedLpAmount,
      }]);
    expect(invokeGetOneTknV2Invokes[1].payment).to.eql([]);

    expect(invokeGetOneTknV2Invokes[2].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokeGetOneTknV2Invokes[2].call.function).to.eql('burn');
    expect(invokeGetOneTknV2Invokes[2].call.args).to.eql([
      {
        type: 'Int',
        value: expectedLpAmount,
      }]);
    expect(invokeGetOneTknV2Invokes[2].payment).to.eql([
      {
        amount: expectedLpAmount,
        assetId: this.lpStableAssetId,
      },
    ]);
    expect(invokeGetOneTknV2Invokes[2].stateChanges.burns).to.eql([
      {
        assetId: this.lpStableAssetId,
        quantity: expectedLpAmount,
      }]);
  });
});
