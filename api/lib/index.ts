import fs from 'fs';
import path from 'path';

import * as registerUser from '../../../../tools/admins/dist/registerUser.js';
import { getContractAndGateway } from '../../../helper/api/dist/index.js';

import type {
  ApiCreateArgs,
  ApiCreateArgsReturn,
} from '../../types';

const WALLET_PATH = path.join(__dirname, '..', '..', '..', '..', 'wallet');

/**
 * Creates a user on the network.
 * Each user has a `username` and a `publicKey`.
 */
export const create = async ({
  username,
  publicKey,
}: ApiCreateArgs): ApiCreateArgsReturn => {
  return new Promise(async (resolve, reject) => {
    // create wallet file here
    const appUser = await registerUser.main(username).catch(reject);
    if (!appUser) { return; }

    // get identity
    const wallet = JSON.parse(fs.readFileSync(path.join(WALLET_PATH, `${username}.id`)).toString());

    // register username
    const {contract, gateway} = await
      getContractAndGateway({username, chaincode: 'user', contract: 'User'})
        .catch(reject);

    if (!contract || !gateway) { return; }

    const id = await
      contract
        .submitTransaction('createUser', username, publicKey)
        .catch(reject);

    await gateway.disconnect();

    if (!id) { reject(); }
    else {
      resolve({
        wallet, 
        id: id.toString()
      });
    }

    return;
  });
};
