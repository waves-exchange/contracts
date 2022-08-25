import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import {
  invokeScript, nodeInteraction as ni, setScript,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import ride from '@waves/ride-js';
import { readFile } from 'fs/promises';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp_to_lp_stable_migration: put.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully change the state in the same way after changing the script from lp.ride to lp_stable.ride when executing the put and get method', async function () {
    const usdnAmount = 1e6;
    const eastAmount = 1e8;
    const shouldAutoStake = false;

    const expectedOutLpAmt = 1e8;
    const expectedPriceLast = 1e8;
    const expectedPriceHistory = 1e8;
    const expectedInvokesCount = 1;

    const lp = address(this.accounts.lp, chainId);

    // putFirst
    // --------------------------------------------------------------------------------------------
    const putFirst = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.eastAssetId, amount: eastAmount },
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
    }, this.accounts.user1);
    await api.transactions.broadcast(putFirst, {});
    await ni.waitForTx(putFirst.id, { apiBase });

    // setScript
    // --------------------------------------------------------------------------------------------
    const ridePath = 'ride';
    const lpStableV2Path = format({ dir: ridePath, base: 'lp_stable.ride' });
    const lpStableAddonV2Path = format({ dir: ridePath, base: 'lp_stable_addon.ride' });

    const { base64: base64LpStableV2 } = ride.compile(
      (await readFile(lpStableV2Path, { encoding: 'utf-8' })),
    ).result;
    const ssTxLpStableV2 = setScript({
      script: base64LpStableV2,
      chainId,
      fee: 38e5,
      senderPublicKey: publicKey(this.accounts.lp),
    }, this.accounts.manager);
    await api.transactions.broadcast(ssTxLpStableV2, {});
    await ni.waitForTx(ssTxLpStableV2.id, { apiBase });

    const { base64: base64LpStableAddonV2 } = ride.compile(
      (await readFile(lpStableAddonV2Path, { encoding: 'utf-8' })),
    ).result;
    const ssTxLpStableAddonV2 = setScript({
      script: base64LpStableAddonV2,
      chainId,
      fee: 10e5,
    }, this.accounts.lpStableV2Addon);
    await api.transactions.broadcast(ssTxLpStableAddonV2, {});
    await ni.waitForTx(ssTxLpStableAddonV2.id, { apiBase });

    // putSecond
    // --------------------------------------------------------------------------------------------
    const putSecond = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.eastAssetId, amount: eastAmount },
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
    }, this.accounts.user1);
    await api.transactions.broadcast(putSecond, {});
    await ni.waitForTx(putSecond.id, { apiBase });

    // getFirstAfterPut
    // --------------------------------------------------------------------------------------------
    const getFirstAfterPut = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.lpAssetId, amount: expectedOutLpAmt },
      ],
      call: {
        function: 'get',
        args: [],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getFirstAfterPut, {});
    const {
      height: heightGetFirstAfterPut,
      stateChanges: stateChangesGetFirstAfterPut,
      id: idGetFirstAfterPut,
    } = await ni.waitForTx(getFirstAfterPut.id, { apiBase });

    const {
      timestamp: timestampGetFirstAfterPut,
    } = await api.blocks.fetchHeadersAt(heightGetFirstAfterPut);
    const keyPriceHistoryGetFirstAfterPut = `%s%s%d%d__price__history__${heightGetFirstAfterPut}__${timestampGetFirstAfterPut}`;

    // check getFirstAfterPut
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetFirstAfterPut.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetFirstAfterPut}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${eastAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetFirstAfterPut}__${timestampGetFirstAfterPut}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetFirstAfterPut,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetFirstAfterPut.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.eastAssetId,
      amount: eastAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes: invokesGetFirstAfterPut } = stateChangesGetFirstAfterPut;
    expect(invokesGetFirstAfterPut.length).to.eql(expectedInvokesCount);

    expect(invokesGetFirstAfterPut[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetFirstAfterPut[0].call.function).to.eql('burn');
    expect(invokesGetFirstAfterPut[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesGetFirstAfterPut[0].stateChanges.burns).to.eql([{
      assetId: this.lpAssetId,
      quantity: expectedOutLpAmt,
    }]);

    // getSecondAfterPut
    // --------------------------------------------------------------------------------------------
    const getSecondAfterPut = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.lpAssetId, amount: expectedOutLpAmt },
      ],
      call: {
        function: 'get',
        args: [],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getSecondAfterPut, {});
    const {
      height: heightGetSecondAfterPut,
      stateChanges: stateChangesGetSecondAfterPut,
      id: idGetSecondAfterPut,
    } = await ni.waitForTx(getFirstAfterPut.id, { apiBase });

    const {
      timestamp: timestampGetSecondAfterPut,
    } = await api.blocks.fetchHeadersAt(heightGetSecondAfterPut);
    const keyPriceHistoryGetSecondAfterPut = `%s%s%d%d__price__history__${heightGetSecondAfterPut}__${timestampGetSecondAfterPut}`;

    // check getSecondAfterPut
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetSecondAfterPut.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetSecondAfterPut}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${eastAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetSecondAfterPut}__${timestampGetSecondAfterPut}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetSecondAfterPut,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetSecondAfterPut.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.eastAssetId,
      amount: eastAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes: invokesGetSecondAfterPut } = stateChangesGetSecondAfterPut;
    expect(invokesGetSecondAfterPut.length).to.eql(expectedInvokesCount);

    expect(invokesGetSecondAfterPut[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetSecondAfterPut[0].call.function).to.eql('burn');
    expect(invokesGetSecondAfterPut[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesGetSecondAfterPut[0].stateChanges.burns).to.eql([{
      assetId: this.lpAssetId,
      quantity: expectedOutLpAmt,
    }]);
  });
});
