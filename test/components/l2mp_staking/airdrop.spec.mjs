import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('l2mp_staking: airdrop function', /** @this {MochaSuiteModified} */() => {
  it(
    'should be able to airdrop locked assets',
    async function () {
      const user1AirdropAmount = 30003;
      const user2AirdropAmount = 40004;
      const airdropTotalAmount = user1AirdropAmount + user2AirdropAmount;

      const airdropTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'airdrop',
          args: [{
            type: 'list',
            value: [
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
              {
                type: 'string',
                value: this.accounts.user2.addr,
              },
            ],
          },
          {
            type: 'list',
            value: [
              {
                type: 'integer',
                value: user1AirdropAmount,
              },
              {
                type: 'integer',
                value: user2AirdropAmount,
              },
            ],
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: airdropTotalAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      const { stateChanges, height } = await broadcastAndWait(airdropTx);

      expect(stateChanges.data).to.deep.equal([
        {
          key: '%s__totalLockedLpAmount',
          type: 'integer',
          value: airdropTotalAmount,
        },
        {
          key: '%s__totalLpAmount',
          type: 'integer',
          value: airdropTotalAmount,
        },
        {
          key: '%s__totalAssetAmount',
          type: 'integer',
          value: airdropTotalAmount,
        },
        {
          key: '%s__startBlock',
          type: 'integer',
          value: height,
        },
        {
          key: `%s%s__userLockedLpAmount__${this.accounts.user1.addr}`,
          type: 'integer',
          value: user1AirdropAmount,
        },
        {
          key: `%s%s__userLockedLpAmount__${this.accounts.user2.addr}`,
          type: 'integer',
          value: user2AirdropAmount,
        },
      ]);
    },
  );

  it(
    'should reject if negative amount',
    async function () {
      const user1AirdropAmount = -30003;
      const user2AirdropAmount = 40004;
      const airdropTotalAmount = user1AirdropAmount + user2AirdropAmount;

      const airdropTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'airdrop',
          args: [{
            type: 'list',
            value: [
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
              {
                type: 'string',
                value: this.accounts.user2.addr,
              },
            ],
          },
          {
            type: 'list',
            value: [
              {
                type: 'integer',
                value: user1AirdropAmount,
              },
              {
                type: 'integer',
                value: user2AirdropAmount,
              },
            ],
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: airdropTotalAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(airdropTx)).to.be.rejectedWith('negative amount value in amountList');
    },
  );

  it(
    'should reject if address is duplicated in addressList',
    async function () {
      const user1AirdropAmount = 30003;
      const user2AirdropAmount = 40004;
      const airdropTotalAmount = user1AirdropAmount + user2AirdropAmount;

      const airdropTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'airdrop',
          args: [{
            type: 'list',
            value: [
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
            ],
          },
          {
            type: 'list',
            value: [
              {
                type: 'integer',
                value: user1AirdropAmount,
              },
              {
                type: 'integer',
                value: user2AirdropAmount,
              },
            ],
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: airdropTotalAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(airdropTx)).to.be.rejectedWith('duplicate address is addressList');
    },
  );

  it(
    'should reject if amountList sum is greater than payment amount',
    async function () {
      const user1AirdropAmount = 30003;
      const user2AirdropAmount = 40004;
      const airdropTotalAmount = user1AirdropAmount + user2AirdropAmount;

      const airdropTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'airdrop',
          args: [{
            type: 'list',
            value: [
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
              {
                type: 'string',
                value: this.accounts.user2.addr,
              },
            ],
          },
          {
            type: 'list',
            value: [
              {
                type: 'integer',
                value: user1AirdropAmount + 1,
              },
              {
                type: 'integer',
                value: user2AirdropAmount,
              },
            ],
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: airdropTotalAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(airdropTx)).to.be.rejectedWith('payment amount is less than sum of amountList');
    },
  );

  it(
    'should reject if address in addressList is invalid',
    async function () {
      const user1AirdropAmount = 30003;
      const user2AirdropAmount = 40004;
      const airdropTotalAmount = user1AirdropAmount + user2AirdropAmount;

      const airdropTx = invokeScript({
        dApp: this.accounts.l2mpStaking.addr,
        call: {
          function: 'airdrop',
          args: [{
            type: 'list',
            value: [
              {
                type: 'string',
                value: this.accounts.user1.addr,
              },
              {
                type: 'string',
                value: 'INVALID_ADDR',
              },
            ],
          },
          {
            type: 'list',
            value: [
              {
                type: 'integer',
                value: user1AirdropAmount,
              },
              {
                type: 'integer',
                value: user2AirdropAmount,
              },
            ],
          }],
        },
        payment: [
          { assetId: this.l2mpAssetId, amount: airdropTotalAmount },
        ],
        additionalFee: 4e5,
        chainId,
      }, this.accounts.user1.seed);

      return expect(broadcastAndWait(airdropTx)).to.be.rejectedWith('invalid address in addressList');
    },
  );
});
