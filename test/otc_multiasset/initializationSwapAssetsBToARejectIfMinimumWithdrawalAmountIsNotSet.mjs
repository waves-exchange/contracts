import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { create } from '@waves/node-api-js';
import {
    data, invokeScript, issue, massTransfer, nodeInteraction,
} from '@waves/waves-transactions';

chai.use(chaiAsPromised);
const { expect } = chai;
const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';

const api = create(apiBase);

describe('otc_multiasset: initializationSwapAssetsBToARejectIfMinimumWithdrawalAmountIsNotSet.mjs', /** @this {MochaSuiteModified} */() => {
    it('should reject initializationSwapAssetsBToA', async function () {
        const amountSomeAsset = this.minAmountDeposit + 1;

        const expectedRejectMessage = 'otc_multiasset.ride: '
            + 'The minimum withdrawal amount for this pair of assets is not set.';

        const someAssetIssueTx = issue({
            name: 'someAsset',
            description: '',
            quantity: 100000e6,
            decimals: 6,
            chainId,
        }, seed);
        await api.transactions.broadcast(someAssetIssueTx, {});
        await waitForTx(someAssetIssueTx.id, { apiBase });
        const someAssetId = someAssetIssueTx.id;

        const someAssetAmount = 100e6;
        const massTransferAssetATx = massTransfer({
            transfers: [{
                recipient: address(this.accounts.user1, chainId), amount: someAssetAmount,
            }],
            assetId: someAssetId,
            chainId,
        }, seed);
        await api.transactions.broadcast(massTransferAssetATx, {});
        await waitForTx(massTransferAssetATx.id, { apiBase });

        const setKeysTx = data({
            additionalFee: 4e5,
            senderPublicKey: publicKey(this.accounts.otcMultiasset),
            data: [{
                key: `%s%s%s__assetsPairStatus__${someAssetId}__${this.assetBId}`,
                type: 'integer',
                value: 0,
            }, {
                key: `%s%s%s%s__balance__${this.assetAId}__${someAssetId}__${address(this.accounts.user1, chainId)}`,
                type: 'integer',
                value: amountSomeAsset,
            }],
            chainId,
        }, this.accounts.manager);
        await api.transactions.broadcast(setKeysTx, {});
        await waitForTx(setKeysTx.id, { apiBase });

        const initializationSwapAssetsBToATx = invokeScript({
            dApp: address(this.accounts.otcMultiasset, chainId),
            payment: [{
                assetId: someAssetId,
                amount: amountSomeAsset,
            }],
            call: {
                function: 'initializationSwapAssetsBToA',
                args: [
                    { type: 'string', value: this.assetAId },
                ],
            },
            chainId,
        }, this.accounts.user1);

        await expect(
            api.transactions.broadcast(initializationSwapAssetsBToATx, {}),
        ).to.be.rejectedWith(
            new RegExp(`^Error while executing account-script: ${expectedRejectMessage}$`),
        );
    });
});