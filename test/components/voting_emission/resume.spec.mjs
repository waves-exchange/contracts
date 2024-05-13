import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { data, issue, transfer } from '@waves/waves-transactions';
import {
  kResumptionFee,
  kStatus,
  statusVerified,
  votingEmission,
} from './callables.mjs';
import { baseSeed, broadcastAndWait, chainId } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`${process.pid}: voting_emission: resume`, () => {
  const resumptionFee = 1e8;
  let amountAssetId;
  let priceAssetId;
  let lpAssetId;

  before(async function () {
    [
      { id: amountAssetId },
      { id: priceAssetId },
      { id: lpAssetId },
    ] = await Promise.all([
      broadcastAndWait(issue({
        name: 'amount asset id', description: '', quantity: 1e8 * 1e8, decimals: 8, reissuable: true, chainId,
      }, baseSeed)),
      broadcastAndWait(issue({
        name: 'price asset id', description: '', quantity: 1e8 * 1e8, decimals: 8, reissuable: true, chainId,
      }, baseSeed)),
      broadcastAndWait(issue({
        name: 'lp asset id', description: '', quantity: 1e8 * 1e8, decimals: 8, reissuable: true, chainId,
      }, baseSeed)),
    ]);

    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: 1e8,
      assetId: this.wxAssetId,
    }, baseSeed));

    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: 1e8,
      assetId: amountAssetId,
    }, baseSeed));

    await broadcastAndWait(transfer({
      recipient: this.accounts.user0.addr,
      amount: 1e8,
      assetId: priceAssetId,
    }, baseSeed));
  });

  it('resumption fee should be specified', async function () {
    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [
        { assetId: this.wxAssetId, amount: 1e8 },
      ],
    })).to.be.rejectedWith('invalid resumption fee');
  });

  it('at least one payment should be attached', async function () {
    await broadcastAndWait(data({
      data: [
        { key: kResumptionFee, type: 'integer', value: resumptionFee },
      ],
      additionalFee: 4e5,
      chainId,
    }, this.accounts.votingEmission.seed));

    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [],
    })).to.be.rejectedWith('at least one payment should be attached');
  });

  it('invalid fee payment asset id', async function () {
    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [
        { assetId: amountAssetId, amount: resumptionFee },
      ],
    })).to.be.rejectedWith('invalid fee payment asset id');
  });

  it('invalid fee payment amount', async function () {
    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [
        { assetId: this.wxAssetId, amount: resumptionFee - 1 },
      ],
    })).to.be.rejectedWith('invalid fee payment amount');
  });

  it('both assets should be verified', async function () {
    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [
        { assetId: this.wxAssetId, amount: resumptionFee },
      ],
    })).to.be.rejectedWith('both assets should be verified');
  });

  it('invalid assets if pool doesn\'t exist', async function () {
    await broadcastAndWait(data({
      data: [
        { key: kStatus(amountAssetId), type: 'integer', value: statusVerified },
        { key: kStatus(priceAssetId), type: 'integer', value: statusVerified },
      ],
      additionalFee: 4e5,
      chainId,
    }, this.accounts.assetsStore.seed));

    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [
        { assetId: this.wxAssetId, amount: resumptionFee },
      ],
    })).to.be.rejectedWith('invalid assets');
  });

  it('assets should be attached if balances are too low', async function () {
    const amountAssetIdInternal = 0;
    const priceAssetIdInternal = 1;
    await broadcastAndWait(data({
      data: [
        { key: `%s%s%s__mappings__baseAsset2internalId__${amountAssetId}`, type: 'integer', value: amountAssetIdInternal },
        { key: `%s%s%s__mappings__baseAsset2internalId__${priceAssetId}`, type: 'integer', value: priceAssetIdInternal },
        { key: `%d%d%s%s__${amountAssetIdInternal}__${priceAssetIdInternal}__mappings__poolAssets2PoolContract`, type: 'string', value: this.accounts.pool1.addr },
        { key: `%s%s%s__${this.accounts.pool1.addr}__mappings__poolContract2LpAsset`, type: 'string', value: lpAssetId },
        { key: `checkBalanceResult__${lpAssetId}`, type: 'boolean', value: false },
      ],
      additionalFee: 4e5,
      chainId,
    }, this.accounts.factory.seed));

    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [
        { assetId: this.wxAssetId, amount: resumptionFee },
      ],
    })).to.be.rejectedWith('balances are too low');
  });

  it('successfully resume with only fee attached', async function () {
    await broadcastAndWait(data({
      data: [
        { key: `checkBalanceResult__${lpAssetId}`, type: 'boolean', value: true },
      ],
      additionalFee: 4e5,
      chainId,
    }, this.accounts.factory.seed));

    await expect(votingEmission.resume({
      dApp: this.accounts.votingEmission.addr,
      caller: this.accounts.user0.seed,
      amountAssetId,
      priceAssetId,
      slippageToleranceOrMinOutAmount: 0,
      payments: [
        { assetId: this.wxAssetId, amount: resumptionFee },
      ],
    })).to.be.fulfilled;
  });
});
