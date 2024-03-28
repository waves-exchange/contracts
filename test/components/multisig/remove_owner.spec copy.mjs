import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { api, broadcastAndWait } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import {
  confirmTransaction, init, kPublicKeys, kQuorum, removeOwner, setQuorum,
} from './contract/multisig.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] multisig: remove owner`, () => {
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

    return expect(removeOwner({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      publicKey,
      additionalFee: 4e5,
    })).to.be.rejectedWith('removeOwner: not allowed');
  });

  it('should throw if tx is not confirmed', async () => {
    const publicKey = '1111';

    return expect(removeOwner({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      publicKey,
      additionalFee: 4e5,
    })).to.be.rejectedWith('Transaction is not allowed by account-script');
  });

  it('invalid public key', async () => {
    const publicKey = '1111';

    const tx = await removeOwner({
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

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('removeOwner: invalid public key');
  });

  it('throw if no such owner', async () => {
    const { publicKey } = accounts.admin3;

    const tx = await removeOwner({
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

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('removeOwner: no such owner');
  });

  it('should successfully remove owner', async () => {
    const { publicKey } = accounts.admin2;

    const tx = await removeOwner({
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

    expect(publicKeys).to.not.contain(publicKey);
  });

  it('quorum should be decreased', async () => {
    const quorum = 2;
    const setQuorumTx = await setQuorum({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      quorum,
      additionalFee: 4e5,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address: accounts.multisig.address,
      txId: setQuorumTx.id,
    });

    await broadcastAndWait(setQuorumTx);

    const { publicKey } = accounts.admin1;
    const removeOwnerTx = await removeOwner({
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
      txId: removeOwnerTx.id,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin1.seed,
      address: accounts.multisig.address,
      txId: removeOwnerTx.id,
    });

    await broadcastAndWait(removeOwnerTx);

    const { value: quorumNew } = await api.addresses.fetchDataKey(
      accounts.multisig.address,
      kQuorum,
    );

    expect(quorumNew).to.equal(quorum - 1);
  });

  it('throw if too few owners', async () => {
    const { publicKey } = accounts.admin0;

    const tx = await removeOwner({
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

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('removeOwner: too few owners');
  });
});
