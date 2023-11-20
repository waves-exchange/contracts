import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data, invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';
import { setup } from './_setup.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe(`[${process.pid}] wxdao: lock`, () => {
  let accounts;

  before(async () => {
    ({
      accounts,
    } = await setup());
  });

  it('successfully set data before lock', async () => {
    const dataPromise = broadcastAndWait(data({
      data: [{
        key: 'test',
        type: 'boolean',
        value: true,
      }],
      chainId,
      additionalFee: 4e5,
    }, accounts.calculator.seed)).catch(({ message }) => { throw new Error(message); });

    return expect(dataPromise).to.be.fulfilled;
  });

  it('can not set data after lock', async () => {
    await broadcastAndWait(invokeScript({
      dApp: accounts.calculator.address,
      call: {
        function: 'lock',
        args: [],
      },
      payment: [],
      chainId,
    }, accounts.calculator.seed)).catch(({ message }) => { throw new Error(message); });

    const dataPromise = broadcastAndWait(data({
      data: [{
        key: 'test',
        type: 'boolean',
        value: true,
      }],
      chainId,
      additionalFee: 4e5,
    }, accounts.calculator.seed)).catch(({ message }) => { throw new Error(message); });

    return expect(dataPromise).to.be.rejectedWith('locked');
  });
});
