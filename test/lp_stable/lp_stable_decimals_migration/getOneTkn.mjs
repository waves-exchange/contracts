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

describe('lp_stable_decimals_migration: getOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully change the state in the same way after changing the script from lp_stable_old.ride to lp_stable.ride when executing the putOneTkn and get method', async function () {
    const amAssetPart = 1e8;
    const prAssetPart = 1e8;
    const outLp = 1e10;
    const slippage = 1e3;
    const autoStake = false;
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;
    const exchResult = 0;
    const notUsed = 0;

    const expectedOutLpAmt = 1e10;
    const expectedPriceLast = 5e7;
    const expectedPriceHistory = 5e7;
    const expectedInvokesCountOldScript = 4;
    const expectedInvokesCountNewScript = 3;

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
    await ni.waitForTx(putOneTknFirst.id, { apiBase });

    // getOneTknAfterPutOneTknFirst
    // --------------------------------------------------------------------------------------------
    const getOneTknAfterPutOneTknFirst = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.lpStableAssetId, amount: outLp },
      ],
      call: {
        function: 'getOneTkn',
        args: [
          { type: 'integer', value: exchResult },
          { type: 'integer', value: notUsed },
          { type: 'integer', value: usdtAmount },
          { type: 'string', value: this.usdtAssetId },
          { type: 'integer', value: slippage },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getOneTknAfterPutOneTknFirst, {});
    const {
      height: heightGetOneTknAfterPutOneTknFirst,
      stateChanges: stateChangesGetOneTknAfterPutOneTknFirst,
      id: idGetOneTknAfterPutOneTknFirst,
    } = await ni.waitForTx(getOneTknAfterPutOneTknFirst.id, { apiBase });

    const {
      timestamp: timestampGetOneTknAfterPutOneTknFirst,
    } = await api.blocks.fetchHeadersAt(heightGetOneTknAfterPutOneTknFirst);
    const keyPriceHistoryGetOneTknAfterPutOneTknFirst = `%s%s%d%d__price__history__${heightGetOneTknAfterPutOneTknFirst}__${timestampGetOneTknAfterPutOneTknFirst}`;

    // check getOneTknAfterPutOneTknFirst
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetOneTknAfterPutOneTknFirst.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetOneTknAfterPutOneTknFirst}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${usdtAmount}__${notUsed}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetOneTknAfterPutOneTknFirst}__${timestampGetOneTknAfterPutOneTknFirst}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetOneTknAfterPutOneTknFirst,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetOneTknAfterPutOneTknFirst.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }]);

    const {
      invokes: invokesGetOneTknAfterPutOneTknFirst,
    } = stateChangesGetOneTknAfterPutOneTknFirst;
    expect(invokesGetOneTknAfterPutOneTknFirst.length).to.eql(expectedInvokesCountOldScript);

    // putOneTknSecond
    // --------------------------------------------------------------------------------------------

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
      fee: 100e5,
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

    // getOneTknAfterSetScript
    // --------------------------------------------------------------------------------------------

    const getOneTknAfterSetScript = invokeScript({
      dApp: lpStable,
      payment: [
        { assetId: this.lpStableAssetId, amount: outLp },
      ],
      call: {
        function: 'getOneTkn',
        args: [
          { type: 'integer', value: exchResult },
          { type: 'integer', value: notUsed },
          { type: 'integer', value: usdtAmount },
          { type: 'string', value: this.usdtAssetId },
          { type: 'integer', value: slippage },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getOneTknAfterSetScript, {});
    const {
      height: heightGetOneTknAfterSetScript,
      stateChanges: stateChangesGetOneTknAfterSetScript,
      id: idGetOneTknAfterSetScript,
    } = await ni.waitForTx(getOneTknAfterSetScript.id, { apiBase });

    const {
      timestamp: timestampGetOneTknAfterSetScript,
    } = await api.blocks.fetchHeadersAt(heightGetOneTknAfterSetScript);
    const keyPriceHistoryGetOneTknAfterSetScript = `%s%s%d%d__price__history__${heightGetOneTknAfterSetScript}__${timestampGetOneTknAfterSetScript}`;

    // check getOneTknAfterSetScript
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetOneTknAfterSetScript.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetOneTknAfterSetScript}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${usdtAmount}__${notUsed}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetOneTknAfterSetScript}__${timestampGetOneTknAfterSetScript}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetOneTknAfterSetScript,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetOneTknAfterSetScript.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }]);

    const { invokes: invokesGetOneTknAfterSetScript } = stateChangesGetOneTknAfterSetScript;
    expect(invokesGetOneTknAfterSetScript.length).to.eql(expectedInvokesCountNewScript);
  });
});
