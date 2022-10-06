import { address, publicKey, randomSeed } from '@waves/ts-lib-crypto';
import {
    data, invokeScript,
    issue,
    massTransfer, nodeInteraction as ni,
    nodeInteraction,
} from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../utils.mjs';

const { waitForTx } = nodeInteraction;
const apiBase = process.env.API_NODE_URL;
const seed = 'waves private node seed with waves tokens';
const chainId = 'R';
const api = create(apiBase);
const seedWordsCount = 5;
const ridePath = 'ride';
const otcMultiassetPath = format({ dir: ridePath, base: 'otc_multiasset.ride' });

export const mochaHooks = {
    async beforeAll() {
        const names = [
            'manager',
            'otcMultiasset',
            'user1',
            'user2',
        ];
        this.accounts = Object.fromEntries(
            names.map((item) => [item, randomSeed(seedWordsCount)]),
        );
        const seeds = Object.values(this.accounts);
        const amount = 1e10;
        const massTransferTx = massTransfer({
            transfers: seeds.map((item) => ({ recipient: address(item, chainId), amount })),
            chainId,
        }, seed);
        await api.transactions.broadcast(massTransferTx, {});
        await waitForTx(massTransferTx.id, { apiBase });

        await setScriptFromFile(otcMultiassetPath, this.accounts.otcMultiasset);

        const assetAIssueTx = issue({
            name: 'assetA',
            description: '',
            quantity: 100000e6,
            decimals: 6,
            chainId,
        }, seed);
        await api.transactions.broadcast(assetAIssueTx, {});
        await waitForTx(assetAIssueTx.id, { apiBase });
        this.assetAId = assetAIssueTx.id;

        const assetAAmount = 100e6;
        const massTransferAssetATx = massTransfer({
            transfers: names.slice(-3).map((name) => ({
                recipient: address(this.accounts[name], chainId), amount: assetAAmount,
            })),
            assetId: this.assetAId,
            chainId,
        }, seed);
        await api.transactions.broadcast(massTransferAssetATx, {});
        await waitForTx(massTransferAssetATx.id, { apiBase });

        const assetBIssueTx = issue({
            name: 'assetB',
            description: '',
            quantity: 100000e6,
            decimals: 6,
            chainId,
        }, seed);
        await api.transactions.broadcast(assetBIssueTx, {});
        await waitForTx(assetBIssueTx.id, { apiBase });
        this.assetBId = assetBIssueTx.id;

        const assetBAmount = 100e6;
        const massTransferAssetBTx = massTransfer({
            transfers: names.slice(-3).map((name) => ({
                recipient: address(this.accounts[name], chainId), amount: assetBAmount,
            })),
            assetId: this.assetBId,
            chainId,
        }, seed);
        await api.transactions.broadcast(massTransferAssetBTx, {});
        await waitForTx(massTransferAssetBTx.id, { apiBase });

        this.withdrawDelay = 2;
        this.depositFee = 3;
        this.withdrawFee = 4;
        this.minAmountDeposit = 5e6;
        this.minAmountWithdraw = 1e6;
        this.pairStatus = 0;

        const registerAssetTx = invokeScript({
            dApp: address(this.accounts.otcMultiasset, chainId),
            payment: [],
            call: {
                function: 'registerAsset',
                args: [
                    { type: 'string', value: this.assetAId },
                    { type: 'string', value: this.assetBId },
                    { type: 'integer', value: this.withdrawDelay },
                    { type: 'integer', value: this.depositFee },
                    { type: 'integer', value: this.withdrawFee },
                    { type: 'integer', value: this.minAmountDeposit },
                    { type: 'integer', value: this.minAmountWithdraw },
                    { type: 'integer', value: this.pairStatus },
                ],
            },
            chainId,
        }, this.accounts.otcMultiasset);
        await api.transactions.broadcast(registerAssetTx, {});
        await ni.waitForTx(registerAssetTx.id, { apiBase });

        const setManagerTx = data({
            additionalFee: 4e5,
            data: [{
                key: '%s__managerPublicKey',
                type: 'string',
                value: publicKey(this.accounts.manager),
            }],
            chainId,
        }, this.accounts.otcMultiasset);
        await api.transactions.broadcast(setManagerTx, {});
        await waitForTx(setManagerTx.id, { apiBase });
    },
};