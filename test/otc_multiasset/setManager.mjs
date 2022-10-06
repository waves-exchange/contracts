import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: setManager.mjs', /** @this {MochaSuiteModified} */() => {
    it(
        'should successfully setManager',
        async function () {
            const anotherPublicKeyManager = publicKey(this.accounts.user1);
            const otcMultiasset = address(this.accounts.otcMultiasset, chainId);

            const setManagerTx = invokeScript({
                dApp: otcMultiasset,
                payment: [],
                call: {
                    function: 'setManager',
                    args: [
                        { type: 'string', value: anotherPublicKeyManager },
                    ],
                },
                chainId,
            }, this.accounts.manager);
            await api.transactions.broadcast(setManagerTx, {});
            const { stateChanges } = await ni.waitForTx(setManagerTx.id, { apiBase });

            expect(stateChanges.data).to.eql([{
                key: '%s__pendingManagerPublicKey',
                type: 'string',
                value: anotherPublicKeyManager,
            }]);
        },
    );
});