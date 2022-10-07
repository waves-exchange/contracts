import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data, nodeInteraction as ni } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

const ridePath = 'ride';
const otcMultiassetPath = format({ dir: ridePath, base: 'otc_multiasset.ride' });

describe('otc_multiasset: verifyIfCallerIsManager.mjs', /** @this {MochaSuiteModified} */() => {
  let someAccount;
  let managerAccount;

  before(async function () {
    someAccount = this.accounts.user1;
    managerAccount = this.accounts.manager;
    await setScriptFromFile(otcMultiassetPath, someAccount);
  });
  it(
    'should successfully verify if caller is manager',
    async () => {
      const dummyKey = 'dummyKey';
      const dummyValue = 'dummyValue';

      const setManagerBoostingTx = data({
        additionalFee: 4e5,
        data: [{
          key: '%s__managerPublicKey',
          type: 'string',
          value: publicKey(managerAccount),
        }],
        chainId,
      }, someAccount);
      await api.transactions.broadcast(setManagerBoostingTx, {});
      await ni.waitForTx(setManagerBoostingTx.id, { apiBase });

      const setDummyKeyTx = data({
        additionalFee: 4e5,
        senderPublicKey: publicKey(someAccount),
        data: [
          {
            key: dummyKey,
            type: 'string',
            value: dummyValue,
          },
        ],
        chainId,
      }, managerAccount);
      await api.transactions.broadcast(setDummyKeyTx, {});
      await ni.waitForTx(setDummyKeyTx.id, { apiBase });

      const dataFromNode = await api.addresses.fetchDataKey(
        address(someAccount, chainId),
        dummyKey,
      );
      expect(dataFromNode).to.eql({
        key: dummyKey,
        type: 'string',
        value: dummyValue,
      });
    },
  );
});
