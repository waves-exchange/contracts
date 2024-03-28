import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { api } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import {
  confirmTransaction, init, kConfirm, kStatus, revokeConfirmation, setQuorum,
} from './contract/multisig.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] multisig: revoke confirmation`, () => {
  let accounts;

  before(async () => {
    ({ accounts } = await setup());

    const owners = [
      accounts.admin0.publicKey,
      accounts.admin1.publicKey,
      accounts.admin2.publicKey,
    ];
    const quorum = 2;

    await init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    });
  });

  it('invalid caller', async () => {
    const { address } = accounts.multisig;
    const txId = '1111';

    return expect(revokeConfirmation({
      dApp: accounts.multisig.address,
      caller: accounts.admin3.seed,
      address,
      txId,
      additionalFee: 4e5,
    })).to.be.rejectedWith('revokeConfirmation: only admin');
  });

  it('should throw if tx id is invalid', async () => {
    const { address } = accounts.multisig;
    const txId = '1111';

    return expect(revokeConfirmation({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId,
      additionalFee: 4e5,
    })).to.be.rejectedWith('revokeConfirmation: invalid txId');
  });

  it('should throw if address is invalid', async () => {
    const quorum = 2;
    const tx = await setQuorum({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      quorum,
      additionalFee: 4e5,
    });

    const address = '1111';

    return expect(revokeConfirmation({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId: tx.id,
      additionalFee: 4e5,
    })).to.be.rejectedWith('revokeConfirmation: invalid address');
  });

  it('should throw if owner did not confirm the tx', async () => {
    const quorum = 2;
    const tx = await setQuorum({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      quorum,
      additionalFee: 4e5,
    });

    const { address } = accounts.multisig;

    return expect(revokeConfirmation({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId: tx.id,
      additionalFee: 4e5,
    })).to.be.rejectedWith('revokeConfirmation: not confirmed');
  });

  it('should successfully revoke confirmation', async () => {
    const quorum = 1;

    const tx = await setQuorum({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      quorum,
      additionalFee: 4e5,
    });

    const { address } = accounts.multisig;
    const txId = tx.id;

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId,
    });

    const [
      { value: statusBefore },
      { value: confirmBefore },
    ] = await api.addresses.data(
      accounts.multisig.address,
      {
        key: [
          encodeURIComponent(kStatus(address, txId)),
          encodeURIComponent(kConfirm(address, txId)),
        ],
      },
    );

    expect(statusBefore).to.equal(false);
    expect(confirmBefore).to.equal(accounts.admin0.publicKey);

    await revokeConfirmation({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId,
    });

    const [
      { value: statusAfter },
      { value: confirmAfter },
    ] = await api.addresses.data(
      accounts.multisig.address,
      {
        key: [
          encodeURIComponent(kStatus(address, txId)),
          encodeURIComponent(kConfirm(address, txId)),
        ],
      },
    );

    expect(statusAfter).to.equal(false);
    expect(confirmAfter).to.equal('');
  });

  it('should throw if quorum is reached', async () => {
    const quorum = 1;

    const tx = await setQuorum({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      quorum,
      additionalFee: 4e5,
    });

    const { address } = accounts.multisig;
    const txId = tx.id;

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin1.seed,
      address,
      txId,
    });

    expect(revokeConfirmation({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId,
    })).to.be.rejectedWith('revokeConfirmation: quorum already reached');
  });
});
