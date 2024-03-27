import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { api, separator } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import {
  confirmTransaction, init, kConfirm, kStatus, setQuorum,
} from './contract/multisig.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] multisig: confirm transaction`, () => {
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

    return expect(confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin3.seed,
      address,
      txId,
      additionalFee: 4e5,
    })).to.be.rejectedWith('confirmTransaction: only admin');
  });

  it('should throw if tx id is invalid', async () => {
    const { address } = accounts.multisig;
    const txId = '1111';

    return expect(confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId,
      additionalFee: 4e5,
    })).to.be.rejectedWith('confirmTransaction: invalid txId');
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

    return expect(confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId: tx.id,
      additionalFee: 4e5,
    })).to.be.rejectedWith('confirmTransaction: invalid address');
  });

  it('should successfully confirm transaction', async () => {
    const quorum = 2;

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
      { value: status0 },
      { value: confirm0 },
    ] = await api.addresses.data(
      accounts.multisig.address,
      {
        key: [
          encodeURIComponent(kStatus(address, txId)),
          encodeURIComponent(kConfirm(address, txId)),
        ],
      },
    );

    expect(status0).to.equal(false);
    expect(confirm0).to.equal(accounts.admin0.publicKey);

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin2.seed,
      address,
      txId,
    });

    const [
      { value: status2 },
      { value: confirm2 },
    ] = await api.addresses.data(
      accounts.multisig.address,
      {
        key: [
          encodeURIComponent(kStatus(address, txId)),
          encodeURIComponent(kConfirm(address, txId)),
        ],
      },
    );

    expect(status2).to.equal(true);
    expect(confirm2).to.equal([
      accounts.admin0.publicKey,
      accounts.admin2.publicKey,
    ].join(separator));
  });

  it('should throw if owner already confirmed tx', async () => {
    const quorum = 2;

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

    expect(confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address,
      txId,
    })).to.be.rejectedWith('confirmTransaction: already confirmed');
  });
});
