import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni, transfer } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format, join } from 'path';
import { checkStateChanges, setScriptFromFile } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;
const seed = 'waves private node seed with waves tokens';
const apiBase = process.env.API_NODE_URL;
const chainId = 'R';
const api = create(apiBase);
const ridePath = join('components', 'lp', 'ride');
const dAppUserPath = format({ dir: ridePath, base: 'dAppUser.ride' });

describe('dAppUser: putOneTknAndGetOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully putOneTknAndGetOneTkn', async function () {
    const dAppUser = this.accounts.user3;
    await setScriptFromFile(dAppUserPath, dAppUser);

    const depositAmount = 15000e6;
    const lp = address(this.accounts.lp, chainId);

    const shibAmount = 10e2;
    const usdnAmount = 25e6;
    const shouldAutoStake = false;

    const signedTranserTx = transfer({
      assetId: this.shibAssetId,
      amount: shibAmount,
      recipient: address(this.accounts.user2, chainId),
    }, seed);
    await api.transactions.broadcast(signedTranserTx, {});
    await ni.waitForTx(signedTranserTx.id, { apiBase });

    const put = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount },
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

    const putOneTknAndGetOneTkn = invokeScript({
      dApp: address(dAppUser, chainId),
      payment: [
        { assetId: this.usdnAssetId, amount: depositAmount },
      ],
      call: {
        function: 'putOneTknAndGetOneTkn',
        args: [
          { type: 'string', value: lp },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putOneTknAndGetOneTkn, {});
    const {
      height, stateChanges, id, payment,
    } = await ni.waitForTx(putOneTknAndGetOneTkn.id, { apiBase });

    const { timestamp } = await api.blocks.fetchHeadersAt(height);

    const keyPriceHistory = `%s%s%d%d__price__history__${height}__${timestamp}`;

    const expectedLpAmount = 37161602423;
    const expectedPriceLastPutOneTkn = 150100000000;
    const expectedPriceHistoryPutOneTkn = 150100000000;
    const expectedFeeAmountPutOneTkn = 15000000;
    const expectedUsdnAmountGetOneTkn = 14970015000;
    const expectedPriceLastGetOneTkn = 250000010;
    const expectedPriceHistoryGetOneTkn = 250000010;
    const expectedFeeAmountGetOneTkn = 14984999;
    const expectedInvokesCount = 3;
    const expectedMinAmout = 0;
    const expectedAutoStake = false;

    expect(payment).to.eql([{
      amount: depositAmount,
      assetId: this.usdnAssetId,
    }]);

    expect(
      await checkStateChanges(stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 3),
    ).to.eql(true);

    const { invokes } = stateChanges;
    expect(invokes.length).to.eql(expectedInvokesCount);

    const invokePutOneTknREADONLY = invokes[0];
    const invokePutOneTkn = invokes[1];
    const invokeGetOneTkn = invokes[2];

    // invoke 0 putOneTknREADONLY
    // ___________________________________________________________________________________________

    expect(
      await checkStateChanges(invokePutOneTknREADONLY.stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokePutOneTknREADONLY.dApp).to.eql(lp);
    expect(invokePutOneTknREADONLY.call.function).to.eql('putOneTknREADONLY');
    expect(invokePutOneTknREADONLY.call.args).to.eql([
      {
        type: 'String',
        value: this.usdnAssetId,
      }, {
        type: 'Int',
        value: depositAmount,
      }]);
    expect(invokePutOneTknREADONLY.payment).to.eql([]);

    // invoke 1 putOneTkn
    // ___________________________________________________________________________________________

    expect(
      await checkStateChanges(invokePutOneTkn.stateChanges, 3, 2, 0, 0, 0, 0, 0, 0, 2),
    ).to.eql(true);

    expect(invokePutOneTkn.dApp).to.eql(lp);
    expect(invokePutOneTkn.call.function).to.eql('putOneTkn');
    expect(invokePutOneTkn.call.args).to.eql([
      {
        type: 'Int',
        value: expectedMinAmout,
      }, {
        type: 'Boolean',
        value: expectedAutoStake,
      }]);
    expect(invokePutOneTkn.payment).to.eql([{
      amount: depositAmount,
      assetId: this.usdnAssetId,
    }]);

    expect(invokePutOneTkn.stateChanges.data).to.eql([{
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLastPutOneTkn,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistoryPutOneTkn,
    }, {
      key: `%s%s%s__P__${address(dAppUser, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__0__${depositAmount}__${expectedLpAmount}__${expectedPriceLastPutOneTkn}__0__0__${height}__${timestamp}__0__0`,
    }]);

    expect(invokePutOneTkn.stateChanges.transfers).to.eql([{
      address: address(dAppUser, chainId),
      asset: this.lpAssetId,
      amount: expectedLpAmount,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.usdnAssetId,
      amount: expectedFeeAmountPutOneTkn,
    }]);

    const { invokes: invokePutOneTknInvokes } = invokePutOneTkn.stateChanges;
    expect(invokePutOneTknInvokes.length).to.eql(2);

    expect(
      await checkStateChanges(
        invokePutOneTknInvokes[0].stateChanges,
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

    expect(invokePutOneTknInvokes[0].dApp)
      .to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokePutOneTknInvokes[0].call.function)
      .to.eql('isPoolOneTokenOperationsDisabledREADONLY');
    expect(invokePutOneTknInvokes[0].call.args).to.eql([
      {
        type: 'String',
        value: lp,
      }]);
    expect(invokePutOneTknInvokes[0].payment).to.eql([]);

    expect(
      await checkStateChanges(
        invokePutOneTknInvokes[1].stateChanges,
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

    expect(invokePutOneTknInvokes[1].dApp)
      .to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokePutOneTknInvokes[1].call.function).to.eql('emit');
    expect(invokePutOneTknInvokes[1].call.args).to.eql([
      {
        type: 'Int',
        value: expectedLpAmount,
      }]);
    expect(invokePutOneTknInvokes[1].payment).to.eql([]);
    expect(invokePutOneTknInvokes[1].stateChanges.transfers).to.eql([
      {
        address: address(this.accounts.lp, chainId),
        asset: this.lpAssetId,
        amount: expectedLpAmount,
      }]);
    expect(invokePutOneTknInvokes[1].stateChanges.reissues).to.eql([{
      assetId: this.lpAssetId,
      isReissuable: true,
      quantity: expectedLpAmount,
    }]);

    // invoke 3 getOneTkn
    // ___________________________________________________________________________________________

    expect(
      await checkStateChanges(
        invokeGetOneTkn.stateChanges,
        3,
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        2,
      ),
    ).to.eql(true);

    expect(invokeGetOneTkn.stateChanges.data).to.eql([{
      key: `%s%s%s__G__${address(dAppUser, chainId)}__${id}`,
      type: 'string',
      value: `%d%d%d%d%d%d__0__${expectedUsdnAmountGetOneTkn}__${expectedLpAmount}__${expectedPriceLastGetOneTkn}__${height}__${timestamp}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLastGetOneTkn,
    }, {
      key: keyPriceHistory,
      type: 'integer',
      value: expectedPriceHistoryGetOneTkn,
    }]);

    expect(invokeGetOneTkn.stateChanges.transfers).to.eql([{
      address: address(dAppUser, chainId),
      asset: this.usdnAssetId,
      amount: expectedUsdnAmountGetOneTkn,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.usdnAssetId,
      amount: expectedFeeAmountGetOneTkn,
    }]);

    const { invokes: invokeGetOneTknInvokes } = invokeGetOneTkn.stateChanges;
    expect(invokeGetOneTknInvokes.length).to.eql(2);

    expect(
      await checkStateChanges(
        invokeGetOneTknInvokes[0].stateChanges,
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

    expect(invokeGetOneTknInvokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokeGetOneTknInvokes[0].call.function).to.eql('isPoolOneTokenOperationsDisabledREADONLY');
    expect(invokeGetOneTknInvokes[0].call.args).to.eql([
      {
        type: 'String',
        value: lp,
      }]);
    expect(invokeGetOneTknInvokes[0].payment).to.eql([]);

    expect(
      await checkStateChanges(
        invokeGetOneTknInvokes[1].stateChanges,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
      ),
    ).to.eql(true);

    expect(invokeGetOneTknInvokes[1].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokeGetOneTknInvokes[1].call.function).to.eql('burn');
    expect(invokeGetOneTknInvokes[1].call.args).to.eql([
      {
        type: 'Int',
        value: expectedLpAmount,
      }]);
    expect(invokeGetOneTknInvokes[1].payment).to.eql([
      {
        amount: expectedLpAmount,
        assetId: this.lpAssetId,
      },
    ]);
    expect(invokeGetOneTknInvokes[1].stateChanges.burns).to.eql([
      {
        assetId: this.lpAssetId,
        quantity: expectedLpAmount,
      }]);
  });
});
