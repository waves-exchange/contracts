import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

chai.use(chaiAsPromised);
const { expect } = chai;

const api = create(apiBase);

describe('voting_emission_candidate: suggestPoolNotActive.mjs', /** @this {MochaSuiteModified} */ () => {
  it('revert then user pools is not active', async function () {
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
      'user pool is not active',
    );
  });
});
