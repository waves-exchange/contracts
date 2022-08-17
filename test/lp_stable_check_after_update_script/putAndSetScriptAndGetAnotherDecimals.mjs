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

describe('lp_stable_check_after_update_script: putAndGetThanSetScriptAndPutAndGetAnotherDecimals.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully change the state in the same way after changing the script from lp_stable.ride to lp_stable_v2.ride when executing the put and get method', async function () {
    const usdtAmount = 1e3;
    const usdnAmount = 1e6;
    const shouldAutoStake = false;

    const expectedInAmtAssetAmt = 1e3;
    const expectedInPriceAssetAmt = 1e6;
    const expectedOutLpAmt = 3162277;
    const expectedPrice = 1e11;
    const expectedSlipByUser = 0;
    const expectedSlippageReal = 0;
    const expectedSlipageAmAmt = 0;
    const expectedSlipagePrAmt = 0;
    const expectedPriceLast = 1e11;
    const expectedPriceHistory = 1e11;
    const expectedInvokesCount = 1;

    const lpStable = address(this.accounts.lpStable, chainId);

    // putFirst
    // --------------------------------------------------------------------------------------------
    const putFirst = invokeScript({
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
    }, this.accounts.user1);
    await api.transactions.broadcast(putFirst, {});
    await ni.waitForTx(putFirst.id, { apiBase });

    // putSecond
    // --------------------------------------------------------------------------------------------
    const putSecond = invokeScript({
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
    }, this.accounts.user1);
    await api.transactions.broadcast(putSecond, {});
    const {
      height: heightPutSecond,
      stateChanges: stateChangesPutSecond,
      id: idPutSecond,
    } = await ni.waitForTx(putSecond.id, { apiBase });

    const { timestamp: timestampPutSecond } = await api.blocks.fetchHeadersAt(heightPutSecond);
    const keyPriceHistoryPutSecond = `%s%s%d%d__price__history__${heightPutSecond}__${timestampPutSecond}`;

    // check putSecond
    // --------------------------------------------------------------------------------------------
    expect(stateChangesPutSecond.data).to.eql([{
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryPutSecond,
      type: 'integer',
      value: expectedPriceHistory,
    }, {
      key: `%s%s%s__P__${address(this.accounts.user1, chainId)}__${idPutSecond}`,
      type: 'string',
      value: `%d%d%d%d%d%d%d%d%d%d__${expectedInAmtAssetAmt}__${expectedInPriceAssetAmt}__${expectedOutLpAmt}__${expectedPrice}__${expectedSlipByUser}__${expectedSlippageReal}__${heightPutSecond}__${timestampPutSecond}__${expectedSlipageAmAmt}__${expectedSlipagePrAmt}`,
    }]);

    expect(stateChangesPutSecond.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.lpStableAssetId,
      amount: expectedOutLpAmt,
    }]);

    const { invokes: invokesPutSecond } = stateChangesPutSecond;
    expect(invokesPutSecond.length).to.eql(expectedInvokesCount);

    expect(invokesPutSecond[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesPutSecond[0].call.function).to.eql('emit');
    expect(invokesPutSecond[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesPutSecond[0].stateChanges.transfers).to.eql([{
      address: address(this.accounts.lpStable, chainId),
      asset: this.lpStableAssetId,
      amount: expectedOutLpAmt,
    }]);
    expect(invokesPutSecond[0].stateChanges.reissues).to.eql([{
      assetId: this.lpStableAssetId,
      isReissuable: true,
      quantity: expectedOutLpAmt,
    }]);

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
