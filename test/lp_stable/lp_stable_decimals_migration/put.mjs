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

describe('lp_stable_decimals_migration: put.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully change the state in the same way after changing the script from lp_stable_old.ride to lp_stable.ride when executing the put and get method', async function () {
    const usdtAmount = 1e6;
    const usdnAmount = 1e6;
    const shouldAutoStake = false;

    const expectedOutLpAmt = 1e8;
    const expectedPriceLast = 1e8;
    const expectedPriceHistory = 1e8;
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
      fee: 34e5,
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

    // putAfterSetScript
    // --------------------------------------------------------------------------------------------
    const putAfterSetScript = invokeScript({
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
    await api.transactions.broadcast(putAfterSetScript, {});
    await ni.waitForTx(putAfterSetScript.id, { apiBase });

    // getAfterPut
    // --------------------------------------------------------------------------------------------
    const getAfterPut = invokeScript({
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
    await api.transactions.broadcast(getAfterPut, {});
    const {
      height: heightGetAfterPut,
      stateChanges: stateChangesGetAfterPut,
      id: idGetAfterPut,
    } = await ni.waitForTx(getAfterPut.id, { apiBase });

    const {
      timestamp: timestampGetAfterPut,
    } = await api.blocks.fetchHeadersAt(heightGetAfterPut);
    const keyPriceHistoryGetAfterPut = `%s%s%d%d__price__history__${heightGetAfterPut}__${timestampGetAfterPut}`;

    // check getAfterPut
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetAfterPut.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetAfterPut}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetAfterPut}__${timestampGetAfterPut}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLast,
    }, {
      key: keyPriceHistoryGetAfterPut,
      type: 'integer',
      value: expectedPriceHistory,
    }]);

    expect(stateChangesGetAfterPut.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes: invokesGetAfterPut } = stateChangesGetAfterPut;
    expect(invokesGetAfterPut.length).to.eql(expectedInvokesCount);

    expect(invokesGetAfterPut[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetAfterPut[0].call.function).to.eql('burn');
    expect(invokesGetAfterPut[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesGetAfterPut[0].stateChanges.burns).to.eql([{
      assetId: this.lpStableAssetId,
      quantity: expectedOutLpAmt,
    }]);

    // getSecondAfterPut
    // --------------------------------------------------------------------------------------------
    const getSecondAfterPut = invokeScript({
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
    await api.transactions.broadcast(getSecondAfterPut, {});
    const {
      height: heightGetSecondAfterPut,
      stateChanges: stateChangesGetSecondAfterPut,
      id: idGetSecondAfterPut,
    } = await ni.waitForTx(getSecondAfterPut.id, { apiBase });

    const {
      timestamp: timestampGetSecondAfterPut,
    } = await api.blocks.fetchHeadersAt(heightGetSecondAfterPut);
    const keyPriceHistoryGetSecondAfterPut = `%s%s%d%d__price__history__${heightGetSecondAfterPut}__${timestampGetSecondAfterPut}`;

    // check getSecondAfterPut
    // --------------------------------------------------------------------------------------------
    expect(stateChangesGetSecondAfterPut.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetSecondAfterPut}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${usdtAmount}__${usdnAmount}__${expectedOutLpAmt}__${expectedPriceLast}__${heightGetSecondAfterPut}__${timestampGetSecondAfterPut}`,
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
      asset: this.usdtAssetId,
      amount: usdtAmount,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: usdnAmount,
    }]);

    const { invokes: invokesGetAfterSecondPut } = stateChangesGetSecondAfterPut;
    expect(invokesGetAfterSecondPut.length).to.eql(expectedInvokesCount);

    expect(invokesGetAfterSecondPut[0].dApp)
      .to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetAfterSecondPut[0].call.function).to.eql('burn');
    expect(invokesGetAfterSecondPut[0].call.args).to.eql([
      {
        type: 'Int',
        value: expectedOutLpAmt,
      }]);
    expect(invokesGetAfterSecondPut[0].stateChanges.burns).to.eql([{
      assetId: this.lpStableAssetId,
      quantity: expectedOutLpAmt,
    }]);
  });
});
