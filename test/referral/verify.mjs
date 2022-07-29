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
const referralPath = format({ dir: ridePath, base: 'referral.ride' });

describe('referral: verify.mjs', /** @this {MochaSuiteModified} */() => {
  const dummyKey = 'dummyKey';
  const dummyValue = 'dummyValue';
  let someAccount;
  let managerAccount;

  before(async function () {
    someAccount = this.accounts.backend;
    managerAccount = this.accounts.manager;
    await setScriptFromFile(referralPath, someAccount);
  });
  it(
    'should successfully verify if caller is account',
    async () => {
      const setDummyKeyTx = data({
        additionalFee: 4e5,
        data: [
          {
            key: dummyKey,
            type: 'string',
            value: dummyValue,
          },
        ],
        chainId,
      }, someAccount);
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
  it(
    'should successfully verify if caller is manager',
    async () => {
      const setManagerReferralTx = data({
        additionalFee: 4e5,
        data: [{
          key: '%s__managerPublicKey',
          type: 'string',
          value: publicKey(managerAccount),
        }],
        chainId,
      }, someAccount);
      await api.transactions.broadcast(setManagerReferralTx, {});
      await ni.waitForTx(setManagerReferralTx.id, { apiBase });

      const setDummyKeyTx = data({
        additionalFee: 4e5,
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
  it(
    'should reject verify if caller is not manager',
    async () => {
    },
  );
});
