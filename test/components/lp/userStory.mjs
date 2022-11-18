import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data, invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp: userStory.mjs', /** @this {MochaSuiteModified} */() => {
  it('should successfully multi-user interaction', async function () {
    const lp = address(this.accounts.lp, chainId);

    const scale8 = 1e8;
    const feeDefaultAmount = (10 * scale8) / 1e4;
    const fee = feeDefaultAmount * 5;

    const shibDecimals = 2;
    const usdnDecimals = 6;

    const shibAmountUser1 = 10e2;
    const usdnAmountUser1 = 25e6;
    const shouldAutoStakeUser1 = false;

    const shibAmountUser2 = 10000e2;
    const shouldAutoStakeUser2 = false;

    const usdnAmountUser3 = 25000e6;
    const shouldAutoStakeUser3 = true;

    // set Fee for LP
    // ___________________________________________________________________________________________

    const setFeeTx = data({
      senderPublicKey: publicKey(this.accounts.lp),
      additionalFee: 4e5,
      data: [{
        key: '%s__fee',
        type: 'integer',
        value: fee,
      }],
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setFeeTx, {});
    await ni.waitForTx(setFeeTx.id, { apiBase });

    // User1 put
    // ___________________________________________________________________________________________

    const put = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmountUser1 },
        { assetId: this.usdnAssetId, amount: usdnAmountUser1 },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: shouldAutoStakeUser1 },
        ],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(put, {});
    await ni.waitForTx(put.id, { apiBase });

    const supplyLpAfterPutUser1 = Math.floor(
      Math.sqrt(
        (shibAmountUser1 * 10 ** shibDecimals) * (usdnAmountUser1 * 10 ** usdnDecimals),
      ),
    );

    // User2 putOneTkn with autoStake false
    // ___________________________________________________________________________________________

    const putOneTknUser2 = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmountUser2 },
      ],
      call: {
        function: 'putOneTkn',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: shouldAutoStakeUser2 },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(putOneTknUser2, {});
    const {
      stateChanges: stateChangesPutOneTknUser2,
    } = await ni.waitForTx(putOneTknUser2.id, { apiBase });

    const lpAmountAfterPutOneTknUser2 = stateChangesPutOneTknUser2.transfers[0].amount;

    // User3 putOneTkn with autoStake true
    // ___________________________________________________________________________________________

    const putOneTknUser3 = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.usdnAssetId, amount: usdnAmountUser3 },
      ],
      call: {
        function: 'putOneTkn',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: shouldAutoStakeUser3 },
        ],
      },
      chainId,
    }, this.accounts.user3);
    await api.transactions.broadcast(putOneTknUser3, {});
    const {
      stateChanges: stateChangesPutOneTknUser3,
    } = await ni.waitForTx(putOneTknUser3.id, { apiBase });

    const lpAmountAfterPutOneTknUser3 = stateChangesPutOneTknUser3
      .invokes[1].stateChanges.transfers[0].amount;

    let totalSupplyLp = supplyLpAfterPutUser1
      + lpAmountAfterPutOneTknUser2
      + lpAmountAfterPutOneTknUser3;

    // User2 getOneTkn
    // ___________________________________________________________________________________________

    const { balance: balanceShibAfterPutOneTknUser3 } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.shibAssetId,
    );

    const getOneTknUser2 = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.lpAssetId, amount: lpAmountAfterPutOneTknUser2 },
      ],
      call: {
        function: 'getOneTkn',
        args: [
          { type: 'string', value: this.shibAssetId },
          { type: 'integer', value: 0 },
        ],
      },
      chainId,
    }, this.accounts.user2);
    await api.transactions.broadcast(getOneTknUser2, {});
    const {
      height: heightGetOneTknUser2,
      stateChanges: stateChangesGetOneTknUser2,
      id: idGetOneTknUser2,
    } = await ni.waitForTx(getOneTknUser2.id, { apiBase });

    const withdrawAmountGetOneTknUser2 = Math.floor(
      balanceShibAfterPutOneTknUser3 * (1 - (1 - lpAmountAfterPutOneTknUser2 / totalSupplyLp) ** 2),
    );

    const feeAmountGetOneTknUser2 = Math.floor(
      (withdrawAmountGetOneTknUser2 * fee) / scale8,
    );

    const {
      timestamp: timestamplGetOneTknUser2,
    } = await api.blocks.fetchHeadersAt(heightGetOneTknUser2);
    const keyPriceHistoryGetOneTknUser2 = `%s%s%d%d__price__history__${heightGetOneTknUser2}__${timestamplGetOneTknUser2}`;

    const { balance: balanceShibAfterGetOneTknUser2 } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.shibAssetId,
    );
    const { balance: balanceUsdnAfterGetOneTknUser2 } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.usdnAssetId,
    );

    const expectedShibAmountGetOneTknUser2 = withdrawAmountGetOneTknUser2 - feeAmountGetOneTknUser2;
    const expectedPriceLastGetOneTknUser2 = Math.floor(
      (balanceUsdnAfterGetOneTknUser2 * 10 ** usdnDecimals)
      / (balanceShibAfterGetOneTknUser2 * 10 ** shibDecimals),
    );
    const expectedPriceHistoryGetOneTknUser2 = expectedPriceLastGetOneTknUser2;
    const expectedFeeAmountGetOneTknUser2 = feeAmountGetOneTknUser2;
    const expectedInvokesCountGetOneTknUser2 = 2;

    expect(
      await checkStateChanges(stateChangesGetOneTknUser2, 3, 2, 0, 0, 0, 0, 0, 0, 2),
    ).to.eql(true);

    expect(stateChangesGetOneTknUser2.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user2, chainId)}__${idGetOneTknUser2}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${expectedShibAmountGetOneTknUser2}__0__${lpAmountAfterPutOneTknUser2}__${expectedPriceLastGetOneTknUser2}__${heightGetOneTknUser2}__${timestamplGetOneTknUser2}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLastGetOneTknUser2,
    }, {
      key: keyPriceHistoryGetOneTknUser2,
      type: 'integer',
      value: expectedPriceHistoryGetOneTknUser2,
    }]);

    expect(stateChangesGetOneTknUser2.transfers).to.eql([{
      address: address(this.accounts.user2, chainId),
      asset: this.shibAssetId,
      amount: expectedShibAmountGetOneTknUser2,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.shibAssetId,
      amount: expectedFeeAmountGetOneTknUser2,
    }]);

    const { invokes: invokesGetOneTknUser2 } = stateChangesGetOneTknUser2;
    expect(invokesGetOneTknUser2.length).to.eql(expectedInvokesCountGetOneTknUser2);

    expect(
      await checkStateChanges(invokesGetOneTknUser2[0].stateChanges, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokesGetOneTknUser2[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetOneTknUser2[0].call.function).to.eql('isPoolOneTokenOperationsDisabledREADONLY');
    expect(invokesGetOneTknUser2[0].call.args).to.eql([
      {
        type: 'String',
        value: lp,
      }]);
    expect(invokesGetOneTknUser2[0].payment).to.eql([]);

    expect(
      await checkStateChanges(invokesGetOneTknUser2[1].stateChanges, 0, 0, 0, 0, 1, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokesGetOneTknUser2[1].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokesGetOneTknUser2[1].call.function).to.eql('burn');
    expect(invokesGetOneTknUser2[1].call.args).to.eql([
      {
        type: 'Int',
        value: lpAmountAfterPutOneTknUser2,
      }]);
    expect(invokesGetOneTknUser2[1].payment).to.eql([
      {
        amount: lpAmountAfterPutOneTknUser2,
        assetId: this.lpAssetId,
      },
    ]);
    expect(invokesGetOneTknUser2[1].stateChanges.burns).to.eql([
      {
        assetId: this.lpAssetId,
        quantity: lpAmountAfterPutOneTknUser2,
      }]);

    totalSupplyLp -= lpAmountAfterPutOneTknUser2;

    // User3 unstakeAndGetOneTkn
    // ___________________________________________________________________________________________

    const unstakeAndGetOneTknUser3 = invokeScript({
      dApp: lp,
      call: {
        function: 'unstakeAndGetOneTkn',
        args: [
          { type: 'integer', value: lpAmountAfterPutOneTknUser3 },
          { type: 'string', value: this.usdnAssetId },
          { type: 'integer', value: 0 },
        ],
      },
      chainId,
    }, this.accounts.user3);
    await api.transactions.broadcast(unstakeAndGetOneTknUser3, {});
    const {
      height: heightUnstakeAndGetOneTknUser3,
      stateChanges: stateChangesUnstakeAndGetOneTknUser3,
      id: idUnstakeAndGetOneTknUser3,
    } = await ni.waitForTx(unstakeAndGetOneTknUser3.id, { apiBase });

    const withdrawAmountUnstakeAndGetOneTknUser3 = Math.floor(
      balanceUsdnAfterGetOneTknUser2 * (1 - (1 - lpAmountAfterPutOneTknUser3 / totalSupplyLp) ** 2),
    );

    const feeAmountUnstakeAndGetOneTknUser3 = Math.floor(
      (withdrawAmountUnstakeAndGetOneTknUser3 * fee) / scale8,
    );

    const {
      timestamp: timestampUnstakeAndGetOneTknUser3,
    } = await api.blocks.fetchHeadersAt(heightUnstakeAndGetOneTknUser3);
    const keyPriceHistoryUnstakeAndGetOneTknUser3 = `%s%s%d%d__price__history__${heightUnstakeAndGetOneTknUser3}__${timestampUnstakeAndGetOneTknUser3}`;

    const {
      balance: balanceShibAfterUnstakeAndGetOneTknUser3,
    } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.shibAssetId,
    );
    const {
      balance: balanceUsdnAfterUnstakeAndGetOneTknUser3,
    } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.usdnAssetId,
    );

    const expectedUsdnAmountUnstakeAndGetOneTknUser3 = withdrawAmountUnstakeAndGetOneTknUser3
      - feeAmountUnstakeAndGetOneTknUser3;
    const expectedPriceLastUnstakeAndGetOneTknUser3 = Math.floor(
      (balanceUsdnAfterUnstakeAndGetOneTknUser3 * 10 ** usdnDecimals)
      / (balanceShibAfterUnstakeAndGetOneTknUser3 * 10 ** shibDecimals),
    );
    const expectedPriceHistoryUnstakeAndGetOneTknUser3 = expectedPriceLastUnstakeAndGetOneTknUser3;
    const expectedFeeAmountUnstakeAndGetOneTknUser3 = feeAmountUnstakeAndGetOneTknUser3;
    const expectedInvokesCountUnstakeAndGetOneTknUser3 = 3;

    expect(
      await checkStateChanges(stateChangesUnstakeAndGetOneTknUser3, 3, 2, 0, 0, 0, 0, 0, 0, 3),
    ).to.eql(true);

    expect(stateChangesUnstakeAndGetOneTknUser3.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user3, chainId)}__${idUnstakeAndGetOneTknUser3}`,
      type: 'string',
      value: `%d%d%d%d%d%d__0__${expectedUsdnAmountUnstakeAndGetOneTknUser3}__${lpAmountAfterPutOneTknUser3}__${expectedPriceLastUnstakeAndGetOneTknUser3}__${heightUnstakeAndGetOneTknUser3}__${timestampUnstakeAndGetOneTknUser3}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLastUnstakeAndGetOneTknUser3,
    }, {
      key: keyPriceHistoryUnstakeAndGetOneTknUser3,
      type: 'integer',
      value: expectedPriceHistoryUnstakeAndGetOneTknUser3,
    }]);

    expect(stateChangesUnstakeAndGetOneTknUser3.transfers).to.eql([{
      address: address(this.accounts.user3, chainId),
      asset: this.usdnAssetId,
      amount: expectedUsdnAmountUnstakeAndGetOneTknUser3,
    }, {
      address: address(this.accounts.feeCollector, chainId),
      asset: this.usdnAssetId,
      amount: expectedFeeAmountUnstakeAndGetOneTknUser3,
    }]);

    const { invokes: invokesUnstakeAndGetOneTknUser3 } = stateChangesUnstakeAndGetOneTknUser3;
    expect(invokesUnstakeAndGetOneTknUser3.length).to.eql(
      expectedInvokesCountUnstakeAndGetOneTknUser3,
    );

    expect(
      await checkStateChanges(
        invokesUnstakeAndGetOneTknUser3[0].stateChanges,
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

    expect(invokesUnstakeAndGetOneTknUser3[0].dApp).to.eql(
      address(this.accounts.factoryV2, chainId),
    );
    expect(invokesUnstakeAndGetOneTknUser3[0].call.function).to.eql('isPoolOneTokenOperationsDisabledREADONLY');
    expect(invokesUnstakeAndGetOneTknUser3[0].call.args).to.eql([
      {
        type: 'String',
        value: lp,
      }]);
    expect(invokesUnstakeAndGetOneTknUser3[0].payment).to.eql([]);

    expect(
      await checkStateChanges(
        invokesUnstakeAndGetOneTknUser3[1].stateChanges,
        0,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ),
    ).to.eql(true);

    expect(invokesUnstakeAndGetOneTknUser3[1].dApp).to.eql(address(this.accounts.staking, chainId));
    expect(invokesUnstakeAndGetOneTknUser3[1].call.function).to.eql('unstake');
    expect(invokesUnstakeAndGetOneTknUser3[1].call.args).to.eql([
      {
        type: 'String',
        value: this.lpAssetId,
      }, {
        type: 'Int',
        value: lpAmountAfterPutOneTknUser3,
      }]);
    expect(invokesUnstakeAndGetOneTknUser3[1].payment).to.eql([]);
    expect(invokesUnstakeAndGetOneTknUser3[1].stateChanges.transfers).to.eql([
      {
        address: lp,
        asset: this.lpAssetId,
        amount: lpAmountAfterPutOneTknUser3,
      }]);

    expect(
      await checkStateChanges(
        invokesUnstakeAndGetOneTknUser3[2].stateChanges,
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

    expect(invokesUnstakeAndGetOneTknUser3[2].dApp).to.eql(
      address(this.accounts.factoryV2, chainId),
    );
    expect(invokesUnstakeAndGetOneTknUser3[2].call.function).to.eql('burn');
    expect(invokesUnstakeAndGetOneTknUser3[2].call.args).to.eql([
      {
        type: 'Int',
        value: lpAmountAfterPutOneTknUser3,
      }]);
    expect(invokesUnstakeAndGetOneTknUser3[2].payment).to.eql([
      {
        amount: lpAmountAfterPutOneTknUser3,
        assetId: this.lpAssetId,
      },
    ]);
    expect(invokesUnstakeAndGetOneTknUser3[2].stateChanges.burns).to.eql([
      {
        assetId: this.lpAssetId,
        quantity: lpAmountAfterPutOneTknUser3,
      }]);

    totalSupplyLp -= lpAmountAfterPutOneTknUser3;

    // User1 get
    // ___________________________________________________________________________________________

    const {
      balance: balanceShibBeforeGetUser1,
    } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.shibAssetId,
    );
    const {
      balance: balanceUsdnBeforeGetUser1,
    } = await api.assets.fetchBalanceAddressAssetId(
      lp,
      this.usdnAssetId,
    );

    const getUser1 = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.lpAssetId, amount: supplyLpAfterPutUser1 },
      ],
      call: {
        function: 'get',
        args: [],
      },
      chainId,
    }, this.accounts.user1);
    await api.transactions.broadcast(getUser1, {});
    const {
      height: heightGetUser1,
      stateChanges: stateChangesGetUser1,
      id: idGetUser1,
    } = await ni.waitForTx(getUser1.id, { apiBase });

    const { timestamp: timestampGetUser1 } = await api.blocks.fetchHeadersAt(heightGetUser1);
    const keyPriceHistoryGetUser1 = `%s%s%d%d__price__history__${heightGetUser1}__${timestampGetUser1}`;

    const expectedShibAmountGetUser1 = Math.floor(
      (balanceShibBeforeGetUser1 * supplyLpAfterPutUser1) / totalSupplyLp,
    );
    const expectedUsdnAmountGetUser1 = Math.floor(
      (balanceUsdnBeforeGetUser1 * supplyLpAfterPutUser1) / totalSupplyLp,
    );

    const expectedPriceLastGetUser1 = Math.floor(
      (balanceUsdnBeforeGetUser1 * 10 ** usdnDecimals)
      / (balanceShibBeforeGetUser1 * 10 ** shibDecimals),
    );
    const expectedPriceHistoryGetUser1 = expectedPriceLastGetUser1;
    const expectedInvokesCountGetUser1 = 1;

    expect(
      await checkStateChanges(stateChangesGetUser1, 3, 2, 0, 0, 0, 0, 0, 0, 1),
    ).to.eql(true);

    expect(stateChangesGetUser1.data).to.eql([{
      key: `%s%s%s__G__${address(this.accounts.user1, chainId)}__${idGetUser1}`,
      type: 'string',
      value: `%d%d%d%d%d%d__${expectedShibAmountGetUser1}__${expectedUsdnAmountGetUser1}__${supplyLpAfterPutUser1}__${expectedPriceLastGetUser1}__${heightGetUser1}__${timestampGetUser1}`,
    }, {
      key: '%s%s__price__last',
      type: 'integer',
      value: expectedPriceLastGetUser1,
    }, {
      key: keyPriceHistoryGetUser1,
      type: 'integer',
      value: expectedPriceHistoryGetUser1,
    }]);

    expect(stateChangesGetUser1.transfers).to.eql([{
      address: address(this.accounts.user1, chainId),
      asset: this.shibAssetId,
      amount: expectedShibAmountGetUser1,
    }, {
      address: address(this.accounts.user1, chainId),
      asset: this.usdnAssetId,
      amount: expectedUsdnAmountGetUser1,
    }]);

    const { invokes } = stateChangesGetUser1;
    expect(invokes.length).to.eql(expectedInvokesCountGetUser1);

    expect(
      await checkStateChanges(invokes[0].stateChanges, 0, 0, 0, 0, 1, 0, 0, 0, 0),
    ).to.eql(true);

    expect(invokes[0].dApp).to.eql(address(this.accounts.factoryV2, chainId));
    expect(invokes[0].call.function).to.eql('burn');
    expect(invokes[0].call.args).to.eql([
      {
        type: 'Int',
        value: supplyLpAfterPutUser1,
      }]);
    expect(invokes[0].payment).to.eql([
      {
        amount: supplyLpAfterPutUser1,
        assetId: this.lpAssetId,
      },
    ]);
    expect(invokes[0].stateChanges.burns).to.eql([
      {
        assetId: this.lpAssetId,
        quantity: supplyLpAfterPutUser1,
      }]);
  });
});
