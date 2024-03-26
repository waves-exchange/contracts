import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { broadcastAndWait } from '../../utils/api.mjs';
import { setup } from './_setup.mjs';
import { confirmTransaction, init } from './contract/multisig.mjs';

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

  it('invalid owners', async () => {
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
    const quorum = 1;

    return expect(init({
      dApp: accounts.multisig.address,
      caller: accounts.multisig.seed,
      owners,
      quorum,
      additionalFee: 4e5,
    })).to.be.fulfilled;
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
