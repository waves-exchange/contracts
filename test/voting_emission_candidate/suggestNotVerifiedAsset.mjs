import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

import { setPoolsStatusActiveData } from './utils/utils.mjs';

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

chai.use(chaiAsPromised);
const { expect } = chai;

const api = create(apiBase);

describe('voting_emission_candidate: suggestNotVerifiedAsset.mjs', /** @this {MochaSuiteModified} */ () => {
  it('revert then asset is not verified', async function () {
    await setPoolsStatusActiveData(
      this.accounts.pools,
      this.amountAssetId,
      this.usdnId,
    );

    const invokeTx = invokeScript(
      {
        dApp: address(this.accounts.votingEmissionCandidate, chainId),
        call: {
          function: 'suggest',
          args: [
            { type: 'string', value: this.amountAssetId },
            { type: 'string', value: this.usdnId },
          ],
        },
        payment: [{ amount: 1e8, assetId: this.wxAssetId }],
        chainId,
      },
      this.accounts.user0,
    );

    return expect(api.transactions.broadcast(invokeTx, {})).to.be.rejectedWith(
      'asset is not verified',
    );
  });
});
