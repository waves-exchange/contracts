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

describe('lp_check_after_update_script: putAndGetAndPutThanSetScriptAndGet.mjs', /** @this {MochaSuiteModified} */() => {
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

    // getAfterPutFirst
    // --------------------------------------------------------------------------------------------
    const getAfterPutFirst = invokeScript({
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
    await api.transactions.broadcast(getAfterPutFirst, {});
    const {
      height: heightGetAfterPutFirst,
      stateChanges: stateChangesGetAfterPutFirst,
      id: idGetAfterPutFirst,
    } = await ni.waitForTx(getAfterPutFirst.id, { apiBase });

    const {
      timestamp: timestampGetAfterPutFirst,
    } = await api.blocks.fetchHeadersAt(heightGetAfterPutFirst);
    const keyPriceHistoryGetAfterPutFirst = `%s%s%d%d__price__history__${heightGetAfterPutFirst}__${timestampGetAfterPutFirst}`;

    // check getAfterPutFirst
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetAfterPutFirst.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetAfterPutFirst}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${eastAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetAfterPutFirst}__${timestampGetAfterPutFirst}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetAfterPutFirst,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetAfterPutFirst.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.eastAssetId,
      amount: eastAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes: invokesGetAfterPutFirst } = stateChangesGetAfterPutFirst;
    expect(invokesGetAfterPutFirst.length).to.eql(expectedInvokesCount);

    expect(invokesGetAfterPutFirst[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetAfterPutFirst[0].call.function).to.eql('burn');
    expect(invokesGetAfterPutFirst[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesGetAfterPutFirst[0].stateChanges.burns).to.eql([{
      assetId: this.lpAssetId,
      quantity: expectedOutLpAmt,
    }]);

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

    // setSomeKeysAfterSetScript
    // --------------------------------------------------------------------------------------------
    // const setLpStableAddonV2Tx = data({
    //   additionalFee: 4e5,
    //   senderPublicKey: publicKey(this.accounts.lp),
    //   data: [{
    //     key: '%s__addonAddr',
    //     type: 'string',
    //     value: address(this.accounts.lpStableV2Addon, chainId),
    //   }],
    //   chainId,
    // }, this.accounts.manager);
    // await api.transactions.broadcast(setLpStableAddonV2Tx, {});
    // await ni.waitForTx(setLpStableAddonV2Tx.id, { apiBase });
    //
    // const setLpStableV2Tx = data({
    //   additionalFee: 4e5,
    //   data: [{
    //     key: '%s__poolAddress',
    //     type: 'string',
    //     value: address(this.accounts.lp, chainId),
    //   }],
    //   chainId,
    // }, this.accounts.lpStableV2Addon);
    // await api.transactions.broadcast(setLpStableV2Tx, {});
    // await ni.waitForTx(setLpStableV2Tx.id, { apiBase });

    // getAfterSetScript
    // --------------------------------------------------------------------------------------------
    const getAfterSetScript = invokeScript({
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
    await api.transactions.broadcast(getAfterSetScript, {});
    const {
      height: heightGetAfterSetScript,
      stateChanges: stateChangesGetAfterSetScript,
      id: idGetAfterSetScript,
    } = await ni.waitForTx(getAfterSetScript.id, { apiBase });

    const {
      timestamp: timestampGetAfterSetScript,
    } = await api.blocks.fetchHeadersAt(heightGetAfterSetScript);
    const keyPriceHistoryGetAfterSetScript = `%s%s%d%d__price__history__${heightGetAfterSetScript}__${timestampGetAfterSetScript}`;

    // check getAfterSetScript
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetAfterSetScript.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetAfterSetScript}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${eastAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetAfterSetScript}__${timestampGetAfterSetScript}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetAfterSetScript,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetAfterSetScript.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.eastAssetId,
      amount: eastAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes: invokesGetAfterSetScript } = stateChangesGetAfterSetScript;
    expect(invokesGetAfterSetScript.length).to.eql(expectedInvokesCount);

    expect(invokesGetAfterSetScript[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetAfterSetScript[0].call.function).to.eql('burn');
    expect(invokesGetAfterSetScript[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesGetAfterSetScript[0].stateChanges.burns).to.eql([{
      assetId: this.lpAssetId,
      quantity: expectedOutLpAmt,
    }]);
  });
});
