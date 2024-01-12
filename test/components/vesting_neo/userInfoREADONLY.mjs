import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { invokeScript } from '@waves/waves-transactions';
import {
  chainId, broadcastAndWait, api,
} from '../../utils/api.mjs';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('vesting_neo: userInfoREADONLY', /** @this {MochaSuiteModified} */() => {
  it(
    'user should claim only unlocked amount',
    async function () {
      const vestingAmount = 1000000;
      const lockLength = 100;
      const elapsedBlocks = 77;
      const { height: currentHeight } = await api.blocks.fetchHeight();
      const startHeight = currentHeight - elapsedBlocks;
      const expectedUnlockedAmount = (vestingAmount / lockLength) * elapsedBlocks;

      const vestingTx = invokeScript({
        dApp: this.accounts.vestingNeo.addr,
        call: {
          function: 'vestingForUser',
          args: [
            { type: 'string', value: this.accounts.user1.addr },
            { type: 'integer', value: vestingAmount },
            { type: 'integer', value: startHeight },
            { type: 'integer', value: lockLength },
          ],
        },
        payment: [
          { assetId: this.wxAssetId, amount: vestingAmount },
        ],
        chainId,
      }, this.accounts.admin1.seed);

      await broadcastAndWait(vestingTx);

      const expr = `userInfoREADONLY("${this.accounts.user1.addr}")`;
      const response = await api.utils.fetchEvaluate(
        this.accounts.vestingNeo.addr,
        expr,
      );
      const checkData = response.result.value._2;

      expect(checkData.value._1.value).to.be.equal(expectedUnlockedAmount);
      expect(checkData.value._2.value).to.be.equal(0);
      expect(checkData.value._3.value).to.be.length(1);
      expect(checkData.value._3.value[0].value[0].value).to.be.equal(vestingAmount);
      expect(checkData.value._3.value[0].value[1].value).to.be.equal(startHeight + lockLength);
      expect(checkData.value._3.value[0].value[2].value).to.be.equal(expectedUnlockedAmount);
      expect(checkData.value._3.value[0].value[3].value)
        .to.be.equal(vestingAmount - expectedUnlockedAmount);
    },
  );

  it(
    'only unlocked amount should ba accumulated',
    async function () {
      const vestingAmount = 2000000;
      const lockLength = 100;
      const elapsedBlocks = 77;
      const { height: currentHeight } = await api.blocks.fetchHeight();
      const startHeight = currentHeight - elapsedBlocks;
      const expectedUnlockedAmount = (vestingAmount / lockLength) * elapsedBlocks;

      const vestingTx = invokeScript({
        dApp: this.accounts.vestingNeo.addr,
        call: {
          function: 'vestingForUser',
          args: [
            { type: 'string', value: this.accounts.user2.addr },
            { type: 'integer', value: vestingAmount },
            { type: 'integer', value: startHeight },
            { type: 'integer', value: lockLength },
          ],
        },
        payment: [
          { assetId: this.wxAssetId, amount: vestingAmount },
        ],
        chainId,
      }, this.accounts.admin1.seed);

      await broadcastAndWait(vestingTx);

      const banTx = invokeScript({
        dApp: this.accounts.vestingNeo.addr,
        call: {
          function: 'ban',
          args: [
            { type: 'string', value: this.accounts.user2.addr },
          ],
        },
        chainId,
      }, this.accounts.admin1.seed);

      await broadcastAndWait(banTx);

      const expr = `userInfoREADONLY("${this.accounts.user2.addr}")`;
      const response = await api.utils.fetchEvaluate(
        this.accounts.vestingNeo.addr,
        expr,
      );
      const checkData = response.result.value._2;

      expect(checkData.value._1.value).to.be.equal(expectedUnlockedAmount);
      expect(checkData.value._2.value).to.be.equal(expectedUnlockedAmount);
      expect(checkData.value._3.value).to.be.length(0);
    },
  );
});
