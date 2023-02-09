import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address } from '@waves/ts-lib-crypto';
import { invokeScript, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { checkStateChanges } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

describe('proposal: setBoostingContract.mjs', /** @this {MochaSuiteModified} */() => {
    it(
      'should set boosting contract address right',
      async function () {
				constructor: async ({
					dApp, caller,
					factoryContract,
					votingEmissionCandidateContract,
					boostingContract,
					stakingContract,
					epochLength,
				}) => {
					const invokeTx = invokeScript(
						{
							dApp,
							call: {
								function: 'constructor',
								args: [
									{ type: 'string', value: boostingContract },
								],
							},
							payment: [],
							additionalFee: 4e5,
							chainId,
						},
						caller,
					);
					return broadcastAndWait(invokeTx);
				},
  
        expect(stateChanges.data).to.eql([{
          key: 'gwxContractAddress__',
          type: 'string',
          value: gwxContractAddress,
        }]);
      },
    );
  });