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

describe('lp_stable_check_after_update_script: putAndPutOneTknAndGetOneTknAndPutOneTknAndSetScriptAndGetOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully change the state in the same way after changing the script from lp_stable_old.ride to lp_stable.ride when executing the putOneTkn and get method', async function () {
    const amAssetPart = 1e8;
    const prAssetPart = 1e8;
    const outLp = 1e10;
    const slippage = 1e3;
    const autoStake = false;
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;
    const delay = 2;

    const expectedOutLpAmt = 1e8;
    const expectedPriceLast = 5e7;
    const expectedPriceHistory = 5e7;
    const expectedInvokesCount = 1;

    const lpStable = address(this.accounts.lpStable, chainId);

    // put (need liquidity)
    // --------------------------------------------------------------------------------------------
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
          { type: 'boolean', value: autoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(put, {});
    await ni.waitForTx(put.id, { apiBase });

    // putOneTknFirst
    // --------------------------------------------------------------------------------------------
    const putOneTknFirst = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
      ],
      call: {
        function: 'putOneTkn',
        args: [
          { type: 'integer', value: amAssetPart },
          { type: 'integer', value: prAssetPart },
          { type: 'integer', value: outLp },
          { type: 'integer', value: slippage },
          { type: 'boolean', value: autoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putOneTknFirst, {});
    const { height: heightPutOneTknFirst } = await ni.waitForTx(putOneTknFirst.id, { apiBase });

    // getAfterPutOneTknFirst
    // --------------------------------------------------------------------------------------------
    const getAfterPutOneTknFirst = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.lpStableAssetId, amount: expectedOutLpAmt },
      ],
      call: {
        function: 'get',
        args: [],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getAfterPutOneTknFirst, {});
    const {
      height: heightGetAfterPutOneTknFirst,
      stateChanges: stateChangesGetAfterPutOneTknFirst,
      id: idGetAfterPutOneTknFirst,
    } = await ni.waitForTx(getAfterPutOneTknFirst.id, { apiBase });

    const {
      timestamp: timestampGetAfterPutOneTknFirst,
    } = await api.blocks.fetchHeadersAt(heightGetAfterPutOneTknFirst);
    const keyPriceHistoryGetAfterPutOneTknFirst = `%s%s%d%d__price__history__${heightGetAfterPutOneTknFirst}__${timestampGetAfterPutOneTknFirst}`;

    // check getAfterPutOneTknFirst
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetAfterPutOneTknFirst.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetAfterPutOneTknFirst}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetAfterPutOneTknFirst}__${timestampGetAfterPutOneTknFirst}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetAfterPutOneTknFirst,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetAfterPutOneTknFirst.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes: invokesGetAfterPutOneTknFirst } = stateChangesGetAfterPutOneTknFirst;
    expect(invokesGetAfterPutOneTknFirst.length).to.eql(expectedInvokesCount);

    expect(invokesGetAfterPutOneTknFirst[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetAfterPutOneTknFirst[0].call.function).to.eql('burn');
    expect(invokesGetAfterPutOneTknFirst[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesGetAfterPutOneTknFirst[0].stateChanges.burns).to.eql([{
      assetId: this.lpStableAssetId,
      quantity: expectedOutLpAmt,
    }]);

    // putOneTknSecond
    // --------------------------------------------------------------------------------------------
    await ni.waitForHeight(heightPutOneTknFirst + delay + 1, { apiBase });

    const putOneTknSecond = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.usdtAssetId, amount: usdtAmount },
      ],
      call: {
        function: 'putOneTkn',
        args: [
          { type: 'integer', value: amAssetPart },
          { type: 'integer', value: prAssetPart },
          { type: 'integer', value: outLp },
          { type: 'integer', value: slippage },
          { type: 'boolean', value: autoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(putOneTknSecond, {});
    await ni.waitForTx(putOneTknSecond.id, { apiBase });

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
      fee: 33e5,
      senderPublicKey: publicKey(this.accounts.lpStable),
    }, this.accounts.manager);
    await api.transactions.broadcast(ssTxLpStableV2, {});
    await ni.waitForTx(ssTxLpStableV2.id, { apiBase });

    const { base64: base64LpStableAddonV2 } = ride.compile(
      (await readFile(lpStableAddonV2Path, { encoding: 'utf-8' })),
    ).result;
    const ssTxLpStableAddonV2 = setScript({
      script: base64LpStableAddonV2,
      chainId,
      fee: 14e5,
    }, this.accounts.lpStableAddon);
    await api.transactions.broadcast(ssTxLpStableAddonV2, {});
    await ni.waitForTx(ssTxLpStableAddonV2.id, { apiBase });

    // setSomeKeysAfterSetScript
    // --------------------------------------------------------------------------------------------
    // const setLpStableAddonV2Tx = data({
    //   additionalFee: 4e5,
    //   senderPublicKey: publicKey(this.accounts.lpStable),
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
    //     value: address(this.accounts.lpStable, chainId),
    //   }],
    //   chainId,
    // }, this.accounts.lpStableV2Addon);
    // await api.transactions.broadcast(setLpStableV2Tx, {});
    // await ni.waitForTx(setLpStableV2Tx.id, { apiBase });

    // getAfterSetScript
    // --------------------------------------------------------------------------------------------
    const getAfterSetScript = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.lpStableAssetId, amount: expectedOutLpAmt },
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
      value: `%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetAfterSetScript}__${timestampGetAfterSetScript}`,
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
      asset: this.usdtAssetId,
      amount: usdtAmount,
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
      assetId: this.lpStableAssetId,
      quantity: expectedOutLpAmt,
    }]);
  });
});
