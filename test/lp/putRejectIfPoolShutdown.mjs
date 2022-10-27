import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('lp: putRejectIfPoolShutdown.mjs', /** @this {MochaSuiteModified} */() => {
  it('should reject put', async function () {
    const usdnAmount = 10e6;
    const shibAmount = 10e2;
    const shouldAutoStake = false;
    const newStatus = 4;

    const expectedRejectMessage = 'Put operation is blocked by admin. Status = 4';

    const lp = address(this.accounts.lp, chainId);

    const setManagePoolTx = invokeScript({
      dApp: address(this.accounts.factoryV2, chainId),
      payment: [],
      call: {
        function: 'managePool',
        args: [
          { type: 'string', value: lp },
          { type: 'integer', value: newStatus },
        ],
      },
      chainId,
    }, this.accounts.manager);
    await api.transactions.broadcast(setManagePoolTx, {});
    await ni.waitForTx(setManagePoolTx.id, { apiBase });

    const put = invokeScript({
      dApp: lp,
      payment: [
        { assetId: this.shibAssetId, amount: shibAmount },
        { assetId: this.usdnAssetId, amount: usdnAmount },
      ],
      call: {
        function: 'put',
        args: [
          { type: 'integer', value: 0 },
          { type: 'boolean', value: shouldAutoStake },
        ],
      },
      chainId,
    }, this.accounts.user1);

    await expect(
      api.transactions.broadcast(put, {}),
    ).to.be.rejectedWith(
      new RegExp(`^Error while executing dApp: ${expectedRejectMessage}$`),
    );
  });
});
