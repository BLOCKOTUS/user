import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import * as registerUser from '../../../tools/admins/dist/registerUser.js';
import { getContractAndGateway } from '../../helper/api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WALLET_PATH = path.join(__dirname, '..', '..', '..', 'wallet');

export const create = async ({
	username,
	publicKey,
}) => {
	return new Promise(async (resolve, reject) => {
		// create wallet file here
		const user = await registerUser.main(username).catch(reject);
    if (!user) return;
    
		// get identity
		const wallet = JSON.parse(fs.readFileSync(path.join(WALLET_PATH, `${username}.id`)));
	
		// register username
		const {contract, gateway} = await 
			getContractAndGateway({username, chaincode: 'user', contract: 'User'})
        .catch(reject);
    
    if (!contract || !gateway) return;

		const id = await 
			contract
				.submitTransaction('createUser', username, publicKey)
				.catch(reject);
		
		await gateway.disconnect();

    if (!id) return;
    
    console.log('Transaction has been submitted');
		resolve({wallet, id: id.toString()});
		return;
	});
};

export const shareKeypair = async ({
	sharedWith,
	groupId,
	myEncryptedKeyPair,
	type,
	user,
}) => {
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'user', contract: 'Keypair'})
        .catch(reject);
        
    if (!contract || !gateway) return;

		var response = await 
			contract
				.submitTransaction('createSharedKeypair', JSON.stringify(sharedWith), groupId, myEncryptedKeyPair, type)
        .catch(reject);    

    await gateway.disconnect();
    
    if (!response) return;

    console.log('Transaction has been submitted', response);
		resolve();
		return;
	});
};

export const getKeypair = async ({
	keypairId,
	user,
}) => {
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'user', contract: 'Keypair'})
        .catch(reject);
        
    if (!contract || !gateway) return;

		// submit transaction
		const rawKeypair = await 
			contract
				.submitTransaction('getKeypair', keypairId)
        .catch(reject);
        
    //disconnect
    await gateway.disconnect();

    if (!rawKeypair) return;

		const keypair = JSON.parse(rawKeypair.toString('utf8'));

		console.log('Transaction has been submitted');
		resolve(keypair);
    return;
	});
};
