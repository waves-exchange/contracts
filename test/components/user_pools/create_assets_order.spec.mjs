import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import {
  invokeScript, issue, data, transfer,
} from '@waves/waves-transactions';

import {
  broadcastAndWait, chainId, baseSeed,
} from '../../utils/api.mjs';
import { userPools } from './contract/user_pools.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('User Pools - Create', /** @this {MochaSuiteModified} */() => {
  let userTokenId = '';
  // move init to root hook
  before(async function () {
    const constructorInvokeTx = invokeScript({
      dApp: address(this.accounts.pools, chainId),
      call: {
        function: 'constructor',
        args: [
          { type: 'string', value: address(this.accounts.factory, chainId) }, // factoryV2Address
          { type: 'string', value: address(this.accounts.store, chainId) }, // assetsStoreAddress
          { type: 'string', value: address(this.accounts.emission, chainId) }, // emissionAddress
          { type: 'list', value: [{ type: 'string', value: '1000' }] }, // priceAssetsMinAmount: List[String]
          { type: 'integer', value: 1000 }, // amountAssetMinAmount
          { type: 'string', value: this.wxAssetId }, // feeAssetId
          { type: 'integer', value: 1000 }, // feeAmount
        ],
      },
      fee: 9e5,
      chainId,
    }, this.accounts.pools);
    await broadcastAndWait(constructorInvokeTx);

    const userTokenIssueTx = issue({
      name: 'user token',
      description: '',
      quantity: 1e16,
      decimals: 8,
      chainId,
    }, this.accounts.user);
    await broadcastAndWait(userTokenIssueTx);
    userTokenId = userTokenIssueTx.id;

    const statusVerified = 2;
    const verifyTokenDataTx = data({
      data: [
        { key: `status_<${userTokenId}>`, type: 'integer', value: statusVerified },
      ],
      chainId,
    }, this.accounts.store);
    await broadcastAndWait(verifyTokenDataTx);

    const usdnTransferTx = transfer({
      amount: 1e8,
      recipient: address(this.accounts.user, chainId),
      assetId: this.usdnAssetId,
      chainId,
    }, baseSeed);
    await broadcastAndWait(usdnTransferTx);

    const wxTransferTx = transfer({
      amount: 1e8,
      recipient: address(this.accounts.user, chainId),
      assetId: this.wxAssetId,
      chainId,
    }, baseSeed);
    await broadcastAndWait(wxTransferTx);
  });

  it('should throw an error if same assets', async function () {
    const createInvokeTxPromise = userPools.create({
      dApp: address(this.accounts.pools, chainId),
      caller: this.accounts.user,
      payments: [
        { amount: 1e8, assetId: userTokenId },
        { amount: 1e8, assetId: userTokenId },
        { amount: 1e3, assetId: this.wxAssetId },
      ],
    });

    expect(broadcastAndWait(createInvokeTxPromise)).to.be.rejectedWith('invalid asset pair');
  });

  it('should successfully create with reversed assets', async function () {
    const { stateChanges } = await userPools.create({
      dApp: address(this.accounts.pools, chainId),
      caller: this.accounts.user,
      payments: [
        { amount: 1e8, assetId: this.usdnAssetId },
        { amount: 1e8, assetId: userTokenId },
        { amount: 1e3, assetId: this.wxAssetId },
      ],
    });

    expect(stateChanges.data).to.deep.include({
      key: `%s%s%s__createCalled__${userTokenId}__${this.usdnAssetId}`,
      type: 'boolean',
      value: true,
    });
  });
});
