import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { address, publicKey } from '@waves/ts-lib-crypto';
import { data } from '@waves/waves-transactions';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';
import { api, broadcastAndWait } from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const chainId = 'R';

const ridePath = '../ride';
const boostingPath = format({ dir: ridePath, base: 'boosting.ride' });

describe('boosting: verifyIfCallerIsManager.mjs', /** @this {MochaSuiteModified} */() => {
  let someAccount;
  let managerAccount;

  before(async function () {
    someAccount = this.accounts.factory.seed;
    managerAccount = this.accounts.manager.seed;
    await setScriptFromFile(boostingPath, someAccount);
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
      await broadcastAndWait(setManagerBoostingTx);

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
      await broadcastAndWait(setDummyKeyTx);

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
