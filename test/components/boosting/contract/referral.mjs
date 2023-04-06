import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { data, invokeScript } from '@waves/waves-transactions';
import {
  publicKey,
} from '@waves/ts-lib-crypto';

import { broadcastAndWait } from '../../../utils/api.mjs';

chai.use(chaiAsPromised);

const chainId = 'R';

export const referral = {
  createProgram: async ({
    caller,
    referralAddr,
    programName = 'wxlock',
    treasuryContract = '',
    implementationContract = '',
    wxAssetId = '',
  }) => {
    const mockBackendPublicKey = publicKey(caller);
    const setBackendPublicKeyTx = data({
      additionalFee: 4e5,
      data: [
        {
          key: '%s__backendPublicKey',
          type: 'string',
          value: mockBackendPublicKey,
        },
      ],
      chainId,
    }, caller);
    await broadcastAndWait(setBackendPublicKeyTx);

    const createReferralProgramTx = invokeScript({
      dApp: referralAddr,
      payment: [],
      call: {
        function: 'createReferralProgram',
        args: [
          { type: 'string', value: programName },
          { type: 'string', value: treasuryContract },
          { type: 'string', value: implementationContract },
          { type: 'string', value: wxAssetId },
        ],
      },
      chainId,
    }, caller);

    return broadcastAndWait(createReferralProgramTx);
  },
};
