import { data } from '@waves/waves-transactions';
import { join } from 'path';
import { readdir, unlink, writeFile } from 'fs/promises';
import prompts from 'prompts';

const config = {
  mainnet: {
    chainId: 87,
    amp: '50',
    heights: [
      { name: 'USDT_USDN_POOL', pub: 'DxhbzFs9BZTiN6kcnyybxmqPTV8xReD6Z5gWQ5AgRX8w', height: '2818148' },
      { name: 'USDC_USDN_POOL', pub: 'puwfE37HNxwJr9vM2zSgNtbZXBXKJXC3et2faRQ8trh', height: '3064959' },
      { name: 'DAI_USDN_POOL', pub: '2v3UkbMeYo6k7kxtMa3riRL6SjgNAkkcEJV6QsGYsNKU', height: '3031693' },
      { name: 'BUSD_USDN_POOL', pub: 'H16Zrn7wiV2o2EPQoAjknZemVPziQy4HHjBBuWroFoy8', height: '3033243' },
      { name: 'UST_USDN_POOL', pub: 'ADu1XuzisH2u8YwfLFVkHDbzwtKpT376inMjiSxYeq83', height: '3034384' },
      { name: 'BUSD_USDC_POOL', pub: '4Ehd2yvuqp3EmRgQpRKmpb8D7FskicPp35nK7GCGZTuM', height: '3131379' },
      { name: 'BUSD_USDT_POOL', pub: '8VDrhRGC3oegSeb7WpJjm3uYokUygH6fPrcJ9t9ytVEe', height: '3131347' },
      { name: 'USDC_USDT_POOL', pub: 'Eh7K5LqQLQiMVtfTT8GBou465Ta9MUg5GpmqtykkYK8J', height: '3131318' },
    ],
  },
  testnet: {
    chainId: 84,
    amp: '50',
    heights: [
      { name: 'USDT_USDN_POOL', pub: 'D1BL65meykxFZTCuq7jq9HSGLLnWvQamQPUNrguW5w39', height: '1764744' },
      { name: 'EAST_USDN_POOL', pub: '6MuWw1pkme7UgQX2hZh8yTZyoWVkz8A4rmHZ1acrsrVm', height: '2014068' },
    ],
  },
};

const keyAmpHistory = (height) => `%s%d__amp__${height}`;
const entryAmpHistory = (height, value) => ({
  key: keyAmpHistory(height),
  type: 'string',
  value,
});

const getAmpHistoryTxs = async (heights, amp, chainId) => heights.map(({ name, pub, height }) => [
  data({
    data: [
      entryAmpHistory(height, amp),
    ],
    chainId,
    senderPublicKey: pub,
    additionalFee: 4e5,
  }),
  name,
]);

try {
  const txsPath = 'txs';
  // clear txs dir
  const { clear } = await prompts({
    type: 'toggle',
    name: 'clear',
    message: 'Clear txs dir?',
    initial: true,
    active: 'yes',
    inactive: 'no',
  });
  if (clear) {
    const exclude = ['.gitignore'];
    const files = await readdir(txsPath);
    await Promise.all(files.map(async (name) => {
      if (exclude.includes(name)) return name;
      return unlink(join(txsPath, name));
    }));
  }

  const promises = Object.keys(config).map(async (network) => {
    const { heights, amp, chainId } = config[network];
    const txs = await getAmpHistoryTxs(heights, amp, chainId);
    await Promise.all(txs.map(async ([tx, name]) => {
      await writeFile(join(txsPath, `${network}${name ? '_' : ''}${name || ''}.json`), JSON.stringify(tx, null, 2));
    }));
  });
  await Promise.all(promises);
} catch (error) {
  console.error(error);
}
