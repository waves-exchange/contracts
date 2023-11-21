import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { transfer } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait, baseSeed, api,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] wxdao: price`, () => {
  let accounts;
  let assets;
  const treasuryValueStart = 1e6;

  before(async () => {
    ({
      accounts, assets,
    } = await setup({ treasuryValue: treasuryValueStart }));
  });

  it('current treasury value < start treasury value', async () => {
    const expr = `calcLpAssetPrice(Address(base58'${accounts.factory.address}'))`;
    const response = await api.utils.fetchEvaluate(
      accounts.calculator.address,
      expr,
    );
    const result = BigInt(response.result.value);
    // (wxPrice = 10¹⁸) / 100
    const expectedResult = BigInt(1e18 / 100);
    expect(result).to.equal(expectedResult);
  });

  it('current treasury value ≥ start treasury value', async () => {
    const wxAmount = 2e8;
    await broadcastAndWait(transfer({
      recipient: accounts.treasury.address,
      assetId: assets.wxAssetId,
      amount: wxAmount,
      additionalFee: 4e5,
      chainId,
    }, baseSeed)).catch(({ message }) => { throw new Error(message); });

    const treasuryValue = 2e6;
    const price = await api.utils.fetchEvaluate(
      accounts.calculator.address,
      `calcLpAssetPrice(Address(base58'${accounts.factory.address}'))`,
    ).then((v) => BigInt(v.result.value));

    // ((Sc - So) * 0.2 / 1000 + PWR price) / 100
    const treasuryValueDiff = BigInt(treasuryValue) - BigInt(treasuryValueStart);
    const expected = ((treasuryValueDiff * BigInt(2)) / BigInt(1e4) + BigInt(1e6)) / BigInt(100);
    expect(price / BigInt(1e12)).to.equal(expected);
  });
});
