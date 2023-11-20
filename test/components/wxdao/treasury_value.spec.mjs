import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { transfer } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait, baseSeed, api,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] wxdao: treasury value`, () => {
  let accounts;
  let assets;
  const wxAmount = 1e8;
  const usdtwxgAmount = 1e6;

  before(async () => {
    ({
      accounts, assets,
    } = await setup());

    await broadcastAndWait(transfer({
      recipient: accounts.treasury.address,
      assetId: assets.wxAssetId,
      amount: wxAmount,
      additionalFee: 4e5,
      chainId,
    }, baseSeed));

    await broadcastAndWait(transfer({
      recipient: accounts.treasury.address,
      assetId: assets.usdtwxgAssetId,
      amount: usdtwxgAmount,
      additionalFee: 4e5,
      chainId,
    }, baseSeed));
  });

  it('successfully set int param on account 1', async () => {
    const expr = `calcTreasuryValue(Address(base58'${accounts.factory.address}'))`;
    const response = await api.utils.fetchEvaluate(
      accounts.calculator.address,
      expr,
    );
    const result = BigInt(response.result.value);
    // ((wxAmount * 10¹⁸ / 10⁸) * (wxPrice = 10¹⁸)) / 10¹⁸
    // + ((usdtwxgAmount * 10¹⁸ / 10⁶) * (usdtwxgPrice = 10¹⁸)) / 10¹⁸
    const expectedResult = BigInt(wxAmount * 1e10 + usdtwxgAmount * 1e12);
    expect(result).to.equal(expectedResult);
  });
});
