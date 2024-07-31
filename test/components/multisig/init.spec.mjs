import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { api, broadcastAndWait, separator } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import {
  confirmTransaction, init, kMultisig, kPublicKeys, kQuorum,
} from './contract/multisig.mjs';

chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe(`[${process.pid}] multisig: init`, () => {
  let accounts;

  before(async () => {
    ({ accounts } = await setup());
  });

  it('invalid caller', async () => {
    const owners = [];
    const quorum = 0;

    return expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('not allowed');
  });

  it('should throw if owners size <= 0', async () => {
    const owners = [];
    const quorum = 0;

    return expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('invalid owners');
  });

  it('should throw if owners size > maxOwners', async () => {
    const maxOwners = 10;
    const owners = Array(maxOwners + 1).fill(accounts.admin0.publicKey);
    const quorum = 0;

    return expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('invalid owners');
  });

  it('should throw id there are duplicates in owners', async () => {
    const owners = [
      accounts.admin0.publicKey,
      accounts.admin1.publicKey,
      accounts.admin1.publicKey,
      accounts.admin2.publicKey,
    ];
    const quorum = 3;

    return expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('must not contain duplicates');
  });

  it('invalid quorum', async () => {
    const owners = [accounts.admin0.publicKey];
    const quorum = 0;

    return expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('invalid quorum');
  });

  it('invalid owner public key', async () => {
    const owners = [accounts.admin0.publicKey, '1111'];
    const quorum = 1;

    return expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    })).to.be.rejectedWith('invalid owner public key');
  });

  it('successfull init', async () => {
    const owners = [
      accounts.admin0.publicKey,
      accounts.admin1.publicKey,
      accounts.admin2.publicKey,
    ];

    const targetQuorum = 1;
    await expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum: targetQuorum,
      additionalFee: 4e5,
    })).to.be.fulfilled;

    const [
      { value: multisig },
      { value: publicKeys },
      { value: quorum },
    ] = await api.addresses.data(
      accounts.multisig.address,
      {
        key: [
          encodeURIComponent(kMultisig),
          encodeURIComponent(kPublicKeys),
          encodeURIComponent(kQuorum),
        ],
      },
    );

    expect(multisig).to.equal(accounts.multisig.address);
    expect(publicKeys).to.equal(owners.join(separator));
    expect(quorum).to.equal(targetQuorum);
  });

  it('already initialized', async () => {
    const owners = [
      accounts.admin0.publicKey,
    ];
    const quorum = 1;

    const tx = await init({
      dry: true,
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    });

    await confirmTransaction({
      dApp: accounts.multisig.address,
      caller: accounts.admin0.seed,
      address: accounts.multisig.address,
      txId: tx.id,
    });

    return expect(broadcastAndWait(tx)).to.be.rejectedWith('already initialized');
  });
});
