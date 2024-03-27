import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('wxdao_funding: process', /** @this {MochaSuiteModified} */() => {
  it(
    'should successfully claim Waves and send WXDAO according to Price',
    async function () {
      // Prices set in mocks
      const claimAmount = 1.5 * 1e8;
      const wavesUsdtPrice = 5.5 * 1e6;
      const wxdaoUsdtPrice = 11.0 * 1e6;
      const processFee = 0.005 * 1e8;

      const swapAmount = claimAmount - processFee;
      const wavesWxdaoPrice = Math.floor((wavesUsdtPrice / wxdaoUsdtPrice) * 1e8);
      const expectedWxdaoSendAmount = Math.floor((swapAmount / 1e8) * wavesWxdaoPrice);

      const { id: txId, stateChanges } = await broadcastAndWait(invokeScript({
        dApp: this.accounts.wxdaoFunding.addr,
        call: {
          function: 'process',
        },
        chainId,
      }, this.accounts.user1.seed));

      expect(stateChanges.transfers).to.deep.equal([
        {
          asset: null,
          amount: processFee,
          address: this.accounts.user1.addr,
        },
        {
          asset: this.wxdaoAssetId,
          amount: expectedWxdaoSendAmount,
          address: this.accounts.mainTreasury.addr,
        },
      ]);

      expect(stateChanges.data).to.deep.equal([
        {
          key: `%s%s__process__${txId}`,
          type: 'string',
          value: `%d%d%d__${claimAmount}__${expectedWxdaoSendAmount}__${processFee}`,
        },
      ]);
    },
  );
});
