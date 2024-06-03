import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { api, broadcastAndWait } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import {
  addOwner, confirmTransaction, init, kPublicKeys,
} from './contract/multisig.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] multisig: add owner`, () => {
  let accounts;

  before(async () => {
    ({ accounts } = await setup());

    const owners = [
      accounts.admin0.publicKey,
      accounts.admin1.publicKey,
      accounts.admin2.publicKey,
    ];
    const quorum = 1;

    await init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    });
  });

  it('invalid caller', async () => {
    const { publicKey } = accounts.admin0;

    return expect(addOwner({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      publicKey,
      additionalFee: 4e5,
    })).to.be.rejectedWith('addOwner: not allowed');
  });

  it('should throw if tx is not confirmed', async () => {
    const publicKey = '1111';

    return expect(addOwner({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      publicKey,
      additionalFee: 4e5,
    })).to.be.rejectedWith('Transaction is not allowed by account-script');
  });

  it('invalid public key', async () => {
    const publicKey = '1111';

    const tx = await addOwner({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      publicKey,
      additionalFee: 4e5,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address: accounts.multisig.address,
      txId: tx.id,
    });

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('addOwner: invalid public key');
  });

  it('throw if public key is already addred', async () => {
    const { publicKey } = accounts.admin2;

    const tx = await addOwner({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      publicKey,
      additionalFee: 4e5,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address: accounts.multisig.address,
      txId: tx.id,
    });

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('addOwner: public key already added');
  });

  it('should successfully add public key', async () => {
    const { publicKey } = accounts.admin3;

    const tx = await addOwner({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      publicKey,
      additionalFee: 4e5,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address: accounts.multisig.address,
      txId: tx.id,
    });

    await broadcastAndWait(tx);

    const { value: publicKeys } = await api.addresses.fetchDataKey(
      accounts.multisig.address,
      kPublicKeys,
    );

    expect(publicKeys).to.contain(publicKey);
  });

  // TODO: check if too many owners
});
