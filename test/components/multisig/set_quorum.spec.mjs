import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { api, broadcastAndWait } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import {
  confirmTransaction, init, kQuorum, setQuorum,
} from './contract/multisig.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] multisig: set quorum`, () => {
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
    const quorum = 2;

    return expect(setQuorum({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('setQuorum: not allowed');
  });

  it('should throw if tx is not confirmed', async () => {
    const quorum = 2;

    return expect(setQuorum({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('Transaction is not allowed by account-script');
  });

  it('quorum should be > 0', async () => {
    const quorum = 0;

    const tx = await setQuorum({
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
      txId: tx.id,
    });

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('setQuorum: invalid quorum');
  });

  it('quorum should be <= owners number', async () => {
    const ownersNumber = 3;
    const tx = await setQuorum({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      quorum: ownersNumber + 1,
      additionalFee: 4e5,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address: accounts.multisig.address,
      txId: tx.id,
    });

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('setQuorum: invalid quorum');
  });

  it('should successfully set quorum', async () => {
    const quorum = 2;

    const tx = await setQuorum({
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
      txId: tx.id,
    });

    await broadcastAndWait(tx);

    const { value: quorumNew } = await api.addresses.fetchDataKey(
      accounts.multisig.address,
      kQuorum,
    );

    expect(quorumNew).to.equal(quorum);
  });
});
