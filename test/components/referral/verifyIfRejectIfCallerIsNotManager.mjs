import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { publicKey } from '@waves/ts-lib-crypto';
import { data } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import { setScriptFromFile } from '../../utils/utils.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const apiBase = process.env.API_NODE_URL;
const chainId = 'R';

const api = create(apiBase);

const ridePath = 'ride';
const referralPath = format({ dir: ridePath, base: 'referral.ride' });

describe('referral: verifyIfRejectIfCallerIsNotManager.mjs', /** @this {MochaSuiteModified} */() => {
  let someAccount;
  let managerAccount;

  before(async function () {
    someAccount = this.accounts.backend;
    managerAccount = this.accounts.manager;
    await setScriptFromFile(referralPath, someAccount);
  });
  it(
    'should successfully verify if caller is manager',
    async () => {
      const dummyKey = 'dummyKey';
      const dummyValue = 'dummyValue';

      const expectedRejectMessage = 'Transaction is not allowed by account-script';

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

      await expect(api.transactions.broadcast(setDummyKeyTx, {})).to.be.rejectedWith(
        expectedRejectMessage,
      );
    },
  );
});
