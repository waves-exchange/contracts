import { data, nodeInteraction, invokeScript } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { address } from '@waves/ts-lib-crypto';

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const { waitForTx } = nodeInteraction;

const api = create(apiBase);

export async function setPoolsStatusActiveData(
  poolsMnemonic,
  amountAssetId,
  usdnId,
) {
  const dataTx = data(
    {
      data: [
        {
          key: `%s%s%s__status__${amountAssetId}__${usdnId}`,
          type: 'string',
          value: 'active',
        },
      ],
      chainId,
    },
    poolsMnemonic,
  );
  await api.transactions.broadcast(dataTx, {});
  await waitForTx(dataTx.id, { apiBase });
  return api.transactions.fetchInfo(dataTx.id);
}

export async function setStoreStatusData(storeMnemonic, amountAssetId) {
  const dataTx = data(
    {
      data: [
        {
          key: `status_<${amountAssetId}>`,
          type: 'integer',
          value: 2,
        },
      ],
      chainId,
    },
    storeMnemonic,
  );
  await api.transactions.broadcast(dataTx, {});
  await waitForTx(dataTx.id, { apiBase });
  return api.transactions.fetchInfo(dataTx.id);
}

export async function suggest(
  votingEmissionCandidateMnemonic,
  userMnemonic,
  amountAssetId,
  usdnId,
  wxAssetId,
) {
  const invokeTx = invokeScript(
    {
      dApp: address(votingEmissionCandidateMnemonic, chainId),
      call: {
        function: 'suggest',
        args: [
          { type: 'string', value: amountAssetId },
          { type: 'string', value: usdnId },
        ],
      },
      payment: [{ amount: 1e8, assetId: wxAssetId }],
      chainId,
    },
    userMnemonic,
  );
  await api.transactions.broadcast(invokeTx, {});
  await waitForTx(invokeTx.id, { apiBase });
  return api.transactions.fetchInfo(invokeTx.id);
}

export async function setUserGWXData(boostingMnemonic, userAddress, gwxAmount) {
  const dataTx = data(
    {
      data: [
        {
          key: address(userAddress, chainId),
          type: 'integer',
          value: gwxAmount,
        },
      ],
      chainId,
    },
    boostingMnemonic,
  );
  await api.transactions.broadcast(dataTx, {});
  await waitForTx(dataTx.id, { apiBase });
  return api.transactions.fetchInfo(dataTx.id);
}

export async function vote(
  votingEmissionCandidateMnemonic,
  userMnemonic,
  amountAssetId,
  usdnId,
  isFavor,
) {
  const invokeTx = invokeScript(
    {
      dApp: address(votingEmissionCandidateMnemonic, chainId),
      call: {
        function: 'vote',
        args: [
          { type: 'string', value: amountAssetId },
          { type: 'string', value: usdnId },
          { type: 'boolean', value: isFavor },
        ],
      },
      chainId,
    },
    userMnemonic,
  );
  await api.transactions.broadcast(invokeTx, {});
  await waitForTx(invokeTx.id, { apiBase });
  return api.transactions.fetchInfo(invokeTx.id);
}

export async function cancelVote(
  votingEmissionCandidateMnemonic,
  userMnemonic,
  amountAssetId,
  usdnId,
) {
  const invokeTx = invokeScript(
    {
      dApp: address(votingEmissionCandidateMnemonic, chainId),
      call: {
        function: 'cancelVote',
        args: [
          { type: 'string', value: amountAssetId },
          { type: 'string', value: usdnId },
        ],
      },
      chainId,
    },
    userMnemonic,
  );
  await api.transactions.broadcast(invokeTx, {});
  await waitForTx(invokeTx.id, { apiBase });

  return api.transactions.fetchInfo(invokeTx.id);
}

export async function finalize(
  votingEmissionCandidateMnemonic,
  userMnemonic,
  amountAssetId,
  usdnId,
) {
  const invokeTx = invokeScript(
    {
      dApp: address(votingEmissionCandidateMnemonic, chainId),
      call: {
        function: 'finalize',
        args: [
          { type: 'string', value: amountAssetId },
          { type: 'string', value: usdnId },
        ],
      },
      chainId,
    },
    userMnemonic,
  );
  await api.transactions.broadcast(invokeTx, {});
  await waitForTx(invokeTx.id, { apiBase });

  return api.transactions.fetchInfo(invokeTx.id);
}

export async function setThreshold(
  votingEmissionCandidateMnemonic,
  userMnemonic,
  threshold,
  additionalFee = 0,
) {
  const invokeTx = invokeScript(
    {
      dApp: address(votingEmissionCandidateMnemonic, chainId),
      call: {
        function: 'setThreshold',
        args: [
          { type: 'integer', value: threshold },
        ],
      },
      chainId,
      additionalFee,
    },
    userMnemonic,
  );
  await api.transactions.broadcast(invokeTx, {});
  await waitForTx(invokeTx.id, { apiBase });

  return api.transactions.fetchInfo(invokeTx.id);
}
