import chai, { expect } from 'chai';
import { order, broadcast, signTx } from '@waves/waves-transactions';
import { EXCHANGE_TYPE } from '@waves/ts-types';
import chaiAsPromised from 'chai-as-promised';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);

const { API_NODE_URL: apiBase, CHAIN_ID: chainId } = process.env;

describe(`${process.pid}: case exchange transaction`, () => {
  before(async function () {
    const scriptPath = format({ dir: 'components/exchange/mock', base: 'case_exchange_transaction.ride' });
    await setScriptFromFile(scriptPath, this.accounts.dapp.seed);
  });

  it('should be fullfiled', async function () {
    const amount = 1e8;
    const amountAsset = this.assetId;
    const matcherPublicKey = this.accounts.matcher.publicKey;
    const price = 1e8;
    const priceAsset = null;
    const matcherFee = 3e5;
    const buyMatcherFee = 3e5;
    const sellMatcherFee = 3e5;
    const fee = 3e5;

    const exchangeTx = signTx(
      {
        type: EXCHANGE_TYPE,
        order1: order(
          {
            orderType: 'sell', amount, amountAsset, matcherPublicKey, price, priceAsset, matcherFee, chainId,
          },
          this.accounts.dapp.seed,
        ),
        order2: order(
          {
            orderType: 'buy', amount, amountAsset, matcherPublicKey, price, priceAsset, matcherFee, chainId,
          },
          this.accounts.user.seed,
        ),
        price,
        amount,
        buyMatcherFee,
        sellMatcherFee,
        fee,
        chainId,
      },
      this.accounts.matcher.seed,
    );

    return expect(broadcast(exchangeTx, apiBase)).to.be.fulfilled;
  });
});
