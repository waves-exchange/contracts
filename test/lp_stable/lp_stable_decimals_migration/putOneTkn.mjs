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

describe('lp_stable_decimals_migration: putOneTkn.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully change the state in the same way after changing the script from lp_stable_old.ride to lp_stable.ride when executing the putOneTkn and get method', async function () {
    const amAssetPart = 1e8;
    const prAssetPart = 1e8;
    const outLp = 1e10;
    const slippage = 1e8;
    const autoStake = false;
    const usdtAmount = 1e8;
    const usdnAmount = 1e8;
    const exchResult = 0;
    const notUsed = 0;

    const expectedOutLpAmt = 1e10;

    // putOnetkn getOnetkn setScript putOnetkn getOnetkn
    // const expectedPriceLast = 5e7;
    // const expectedPriceHistory = 5e7;
    // const expectedInvokesCountOldScript = 4;
    // const expectedInvokesCountNewScript = 3;

    // putOnetkn setScript putOnetkn getOnetkn getOnetkn
    const expectedAfterFirstPutOneTknPriceLast = 16666666;
    const expectedAfterFirstPutOneTknPriceHistory = 16666666;
    const expectedAfterSecondPutOneTknPriceLast = 25000000;
    const expectedAfterSecondPutOneTknPriceHistory = 25000000;
    const expectedInvokesCountScript = 3;

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
    await ni.waitForTx(putOneTknFirst.id, { apiBase });

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
      fee: 15e5,
    }, this.accounts.lpStableAddon);
    await api.transactions.broadcast(ssTxLpStableAddonV2, {});
    await ni.waitForTx(ssTxLpStableAddonV2.id, { apiBase });

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
    await ni.waitForTx(putOneTknSecond.id, { apiBase });

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
      value: `%d%d%d%d%d%d__${usdtAmount}__${notUsed}__${expectedOutLpAmt}__${expectedAfterFirstPutOneTknPriceLast}__${heightGetOneTknAfterPutOneTknFirst}__${timestampGetOneTknAfterPutOneTknFirst}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedAfterFirstPutOneTknPriceLast,
    }, {
      key: keyPriceHistoryGetOneTknAfterPutOneTknFirst,
      type: 'integer',
      value: expectedAfterFirstPutOneTknPriceHistory,
    }]);

    expect(stateChangesGetOneTknAfterPutOneTknFirst.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }]);

    const {
      invokes: invokesGetOneTknAfterPutOneTknFirst,
    } = stateChangesGetOneTknAfterPutOneTknFirst;
    expect(invokesGetOneTknAfterPutOneTknFirst.length).to.eql(expectedInvokesCountScript);

    // getOneTknAfterPutOneTknSecond
    // --------------------------------------------------------------------------------------------

    const getOneTknAfterPutOneTknSecond = invokeScript({
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
    await api.transactions.broadcast(getOneTknAfterPutOneTknSecond, {});
    const {
      height: heightGetOneTknAfterPutOneTknSecond,
      stateChanges: stateChangesGetOneTknAfterPutOneTknSecond,
      id: idGetOneTknAfterPutOneTknSecond,
    } = await ni.waitForTx(getOneTknAfterPutOneTknSecond.id, { apiBase });

    const {
      timestamp: timestampGetOneTknAfterPutOneTknSecond,
    } = await api.blocks.fetchHeadersAt(heightGetOneTknAfterPutOneTknSecond);
    const keyPriceHistoryGetOneTknAfterPutOneTknSecond = `%s%s%d%d__price__history__${heightGetOneTknAfterPutOneTknSecond}__${timestampGetOneTknAfterPutOneTknSecond}`;

    // check getOneTknAfterPutOneTknSecond
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetOneTknAfterPutOneTknSecond.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetOneTknAfterPutOneTknSecond}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${usdtAmount}__${notUsed}__${expectedOutLpAmt}__${expectedAfterSecondPutOneTknPriceLast}__${heightGetOneTknAfterPutOneTknSecond}__${timestampGetOneTknAfterPutOneTknSecond}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedAfterSecondPutOneTknPriceLast,
    }, {
      key: keyPriceHistoryGetOneTknAfterPutOneTknSecond,
      type: 'integer',
      value: expectedAfterSecondPutOneTknPriceHistory,
    }]);

    expect(stateChangesGetOneTknAfterPutOneTknSecond.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }]);

    const {
      invokes: invokesGetOneTknAfterPutOneTknSecond,
    } = stateChangesGetOneTknAfterPutOneTknSecond;
    expect(invokesGetOneTknAfterPutOneTknSecond.length).to.eql(expectedInvokesCountScript);
  });
});
