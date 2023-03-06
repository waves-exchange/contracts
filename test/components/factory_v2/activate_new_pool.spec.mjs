import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const { waitForTx } = nodeInteraction;

const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';

const api = create(apiBase);

/** @typedef {
 * Mocha.Suite & {accounts: Object.<string, number>, wxAssetId: string, usdnAssetId: string}
 * } MochaSuiteModified
 * */

describe('Factory V2 - activateNewPool', /** @this {MochaSuiteModified} */() => {
  before(async function () {
    const constructorInvokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: '' }, // stakingContract
          { type: 'string', value: '' }, // boostingContract
          { type: 'string', value: '' }, // idoContract
          { type: 'string', value: '' }, // teamContract
          { type: 'string', value: '' }, // emissionContract
          { type: 'string', value: '' }, // restContract
          { type: 'string', value: '' }, // slpipageContract
          { type: 'integer', value: 0 }, // priceDecimals
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(constructorInvokeTx, {});
    await waitForTx(constructorInvokeTx.id, { apiBase });

    const constructorV2InvokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'constructorV2',
        args: [
          { type: 'string', value: publicKey(this.accounts.matcher) }, // mathcherPub58Str
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(constructorV2InvokeTx, {});
    await waitForTx(constructorV2InvokeTx.id, { apiBase });

    const constructorV3InvokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'constructorV3',
        args: [
          { type: 'string', value: '' }, // daoContract
          { type: 'string', value: '' }, // marketingContract
          { type: 'string', value: '' }, // gwxRewardsContract
          { type: 'string', value: '' }, // birdsContract
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(constructorV3InvokeTx, {});
    await waitForTx(constructorV3InvokeTx.id, { apiBase });

    const constructorV4InvokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'constructorV4',
        args: [
          { type: 'string', value: '' }, // legacyFactoryContract
          { type: 'list', value: [] }, // legacyPools: List[String]
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(constructorV4InvokeTx, {});
    await waitForTx(constructorV4InvokeTx.id, { apiBase });

    const constructorV5InvokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'constructorV5',
        args: [
          { type: 'string', value: address(this.accounts.store, chainId) }, // assetsStoreContract
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(constructorV5InvokeTx, {});
    await waitForTx(constructorV5InvokeTx.id, { apiBase });
  });
  it('Assets store functions should be called', async function () {
    // issue USDN asset
    const someAssetIssueTx = issue({
      name: 'some asset',
      description: '',
      quantity: 1e8,
      decimals: 8,
      chainId,
    }, seed);
    await api.transactions.broadcast(someAssetIssueTx, {});
    await waitForTx(someAssetIssueTx.id, { apiBase });

    const activateNewPoolInvokeTx = invokeScript({
      dApp: address(this.accounts.factory, chainId),
      call: {
        function: 'activateNewPool',
        args: [
          { type: 'string', value: address(this.accounts.lp, chainId) }, // poolAddress
          { type: 'string', value: someAssetIssueTx.id }, // amountAssetStr
          { type: 'string', value: this.usdnAssetId }, // priceAssetStr
          { type: 'string', value: 'NEWLP' }, // lpAssetName
          { type: 'string', value: '' }, // lpAssetDescr
          { type: 'integer', value: 0 }, // poolWeight
          { type: 'string', value: 'VLT' }, // poolType
          { type: 'string', value: '' }, // logo
        ],
      },
      fee: 1e8 + 9e5,
      chainId,
    }, this.accounts.factory);
    await api.transactions.broadcast(activateNewPoolInvokeTx, {});
    await waitForTx(activateNewPoolInvokeTx.id, { apiBase });
    const { stateChanges } = await api.transactions.fetchInfo(activateNewPoolInvokeTx.id);
    expect(stateChanges.invokes.map((item) => [item.dApp, item.call.function]))
      .to.deep.include.members([
        [address(this.accounts.lp, chainId), 'activate'],
        [address(this.accounts.store, chainId), 'createOrUpdate'],
        [address(this.accounts.store, chainId), 'addLabel'],
        [address(this.accounts.store, chainId), 'setLogo'],
        [address(this.accounts.store, chainId), 'addAssetsLink'],
        [address(this.accounts.store, chainId), 'increaseAssetPoolsNumber'],
      ]);
    expect(stateChanges.data).to.deep.include({
      key: `%s%s__spread__${address(this.accounts.lp, chainId)}`,
      type: 'integer',
      value: 2000000,
    });
  });
});
