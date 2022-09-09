import { address, randomSeed } from '@waves/ts-lib-crypto';
import { issue, massTransfer, nodeInteraction } from '@waves/waves-transactions';
import { create } from '@waves/node-api-js';
import { format } from 'path';
import ora from 'ora';
import { setScriptFromFile } from '../utils.mjs';

export const mochaHooks = {

};
