import { data, invokeScript } from '@waves/waves-transactions';
import { address } from '@waves/ts-lib-crypto';
import {
  broadcastAndWait,
  chainId,
  separator,
} from '../../../utils/api.mjs';

export const factory = {
  init: async ({
    caller,
    stakingAddress = '',
    boostingAddress = '',
    idoAddress = '',
    teamAddress = '',
    emissionAddress = '',
    restAddress = '',
    slippageAddress = '',
    daoAddress = '',
    marketingAddress = '',
    gwxAddress = '',
    birdsAddress = '',
    votingEmissionAddress = '',
  }) => {
    const dataTx = data({
      data: [
        {
          key: ['%s', 'factoryConfig'].join(separator),
          type: 'string',
          value: [
            '%s%s%s%s%s%s%s%s%s%s%s',
            stakingAddress,
            boostingAddress,
            idoAddress,
            teamAddress,
            emissionAddress,
            restAddress,
            slippageAddress,
            daoAddress,
            marketingAddress,
            gwxAddress,
            birdsAddress,
          ].join(separator),
        },
        { key: ['%s', 'votingEmissionContract'].join(separator), type: 'string', value: votingEmissionAddress },
      ],
      additionalFee: 4e5,
      chainId,
    }, caller);

    return broadcastAndWait(dataTx);
  },

  createPool: async ({
    amountAssetId,
    priceAssetId,
    accountsStore,
    accountsFactoryV2,
    accountsLp,
    accountsFeeCollector,
  }) => {
    const setAssetsStoreContractTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__assetsStoreContract',
          type: 'string',
          value: address(accountsStore, chainId),
        },
      ],
      chainId,
    }, accountsFactoryV2);
    await broadcastAndWait(setAssetsStoreContractTx);

    const setFactoryContractTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__factoryContract',
          type: 'string',
          value: address(accountsFactoryV2, chainId),
        },
      ],
      chainId,
    }, accountsLp);
    await broadcastAndWait(setFactoryContractTx);

    const activateNewPoolTx = invokeScript({
      dApp: address(accountsFactoryV2, chainId),
      fee: 100900000,
      call: {
        function: 'activateNewPool',
        args: [
          { type: 'string', value: address(accountsLp, chainId) },
          { type: 'string', value: amountAssetId },
          { type: 'string', value: priceAssetId },
          { type: 'string', value: `TOKEN${priceAssetId.toUpperCase()}LP` },
          { type: 'string', value: `${amountAssetId.toUpperCase()}/${priceAssetId.toUpperCase()} pool liquidity provider token` },
          { type: 'integer', value: 0 },
          { type: 'string', value: '' },
          { type: 'string', value: '<svg width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'><g clip-path=\'url(#clip0_28951_287407)\'><path opacity=\'0.3\' d=\'M19.6987 12.703C19.5533 14.3081 18.9177 15.7731 17.9399 16.9456L20.9216 19.9272C22.6542 17.9797 23.838 15.4686 24 12.703L19.6987 12.703Z\' fill=\'#00FEB5\'/><path opacity=\'0.7\' d=\'M3.07691 19.9272L6.05859 16.9456C5.08081 15.7731 4.44525 14.3081 4.29987 12.703L-0.00145843 12.703C0.160589 15.4686 1.34437 17.9797 3.07691 19.9272Z\' fill=\'#00FEB5\'/><path opacity=\'0.17\' d=\'M12.7031 -9.87604e-07L12.7031 4.30133C16.4072 4.63715 19.3629 7.59283 19.6987 11.2969L24 11.2969C23.6466 5.26758 18.7324 0.353393 12.7031 -9.87604e-07Z\' fill=\'#00FEB5\'/><path d=\'M0 11.2969L4.30133 11.2969C4.63715 7.59283 7.59284 4.63715 11.2969 4.30133L11.2969 0C5.26758 0.353393 0.353394 5.26758 0 11.2969Z\' fill=\'#00FEB5\'/><path opacity=\'0.5\' d=\'M7.05664 17.9399L4.07495 20.9216C6.18726 22.8007 8.95947 24 12.0023 24C15.0452 24 17.8174 22.8007 19.9297 20.9216L16.948 17.9399C15.6062 19.0589 13.8821 19.7344 12.0023 19.7344C10.1226 19.7344 8.39844 19.0589 7.05664 17.9399Z\' fill=\'#00FEB5\'/><path d=\'M12 18C8.68629 18 6 15.3137 6 12C6 12 9.5 9.99997 12 12C14.5 14 18 12 18 12C18 15.3137 15.3137 18 12 18Z\' fill=\'#05B595\'/><path d=\'M12 12C9.5 9.99997 6 12 6 12C6.00001 8.68628 8.6863 6 12 6C15.3137 6 18 8.68628 18 12C18 12 14.5 14 12 12Z\' fill=\'#00FEB5\'/><path d=\'M12.3924 17H11.668V15.996C10.2314 15.8748 9.04225 15.0612 9 13.7167H10.0503C10.159 14.438 10.6237 14.9862 11.668 15.0958L12.3924 15.1016C13.5151 15.0208 13.9497 14.4957 13.9497 13.8321C13.9497 13.1973 13.6237 12.7934 12.4286 12.5164L11.668 12.3433L11.5292 12.3087C10.0262 11.9625 9.2173 11.322 9.2173 10.1852C9.2173 8.9446 10.2374 8.12522 11.668 8.00404V7H12.3924V7.99827C13.7867 8.11945 14.8732 8.96192 14.9155 10.2372H13.8652C13.7867 9.45816 13.2072 9.00231 12.3924 8.90421L11.668 8.90998C10.7505 9.02539 10.2676 9.55626 10.2676 10.116C10.2676 10.6815 10.6298 11.12 11.668 11.3624L12.3924 11.5297L12.5795 11.5701C14.1308 11.9279 15 12.5395 15 13.7513C15 15.142 13.8169 15.8979 12.3924 16.0017V17Z\' fill=\'#19202E\'/></g><defs><clipPath id=\'clip0_28951_287407\'><rect width=\'24\' height=\'24\' fill=\'white\'/></clipPath></defs></svg>' },
        ],
      },
      chainId,
    }, accountsFactoryV2);
    const { stateChanges } = await broadcastAndWait(activateNewPoolTx);
    const lpAssetId = stateChanges.issues[0].assetId;

    const setFeeCollectorFactoryV2Tx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__feeCollectorAddress',
        type: 'string',
        value: address(accountsFeeCollector, chainId),
      }],
      chainId,
    }, accountsFactoryV2);
    await broadcastAndWait(setFeeCollectorFactoryV2Tx);

    const setDefaultInOutFeeTx = data({
      additionalFee: 4e5,
      data: [{
        key: '%s__inFeeDefault',
        type: 'integer',
        value: '100000',
      }, {
        key: '$s__outFeeDefault',
        type: 'integer',
        value: '100000',
      }],
      chainId,
    }, accountsFactoryV2);
    await broadcastAndWait(setDefaultInOutFeeTx);

    return { lpAssetId };
  },
};
