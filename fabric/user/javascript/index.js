/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const registerUser = require('../../../../admins/registerUser');

const WALLET_PATH = path.join(__dirname, '..', '..', '..', '..', '..', 'wallet');
const CCP_PATH = path.resolve(__dirname, '..', '..', '..', '..', '..', 'network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

async function getContractAndGateway({username, contract}) {
	// load the network configuration
	const ccp = JSON.parse(fs.readFileSync(CCP_PATH, 'utf8'));

	// Create a new file system based wallet for managing identities.
	const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

	// Check to see if we've already enrolled the user.
	const identity = await wallet.get(username);
	if (!identity) {
		throw new Error(`An identity for the user "${username}" does not exist in the wallet`);
	}

	// Create a new gateway for connecting to our peer node.
	const gateway = new Gateway();
	await gateway.connect(ccp, { identity, discovery: { enabled: true, asLocalhost: true } });

	// Get the network (channel) our contract is deployed to.
	const network = await gateway.getNetwork('mychannel');

	// Get the contract from the network.
	return {contract: network.getContract('user', contract), gateway};
}

async function create({
	username,
	publicKey
}) {
	return new Promise(async (resolve, reject) => {
		// create wallet file here
		const registered = await registerUser.main(username).catch(reject);
		if(!registered) return;
		
		// get identity
		const wallet = JSON.parse(fs.readFileSync(path.join(WALLET_PATH, `${username}.id`)));
	
		// register username
		const {contract, gateway} = await getContractAndGateway({username, contract: 'User'});
		const id = await contract.submitTransaction('createUser', username, publicKey);
		
		await gateway.disconnect();

		resolve({wallet, id: id.toString()});

		return;
	})
}

async function shareKeypair({
	sharedWith,
	groupId,
	myEncryptedKeyPair,
	type,
	user
}) {
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await 
			getContractAndGateway({username: user.username, contract: 'Keypair'})
				.catch(reject);

		var response = await 
			contract
				.submitTransaction('createSharedKeypair', JSON.stringify(sharedWith), groupId, myEncryptedKeyPair, type)
				.catch(reject);

		console.log('Transaction has been submitted', response);

		await gateway.disconnect();
	
		resolve();
		return;
	})
}

async function getKeypair({
	keypairId,
	user
}) {
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await 
			getContractAndGateway({username: user.username, contract: 'Keypair'})
				.catch(reject);

		// submit transaction
		const rawKeypair = await 
			contract
				.submitTransaction('getKeypair', keypairId)
				.catch(reject);

		const keypair = JSON.parse(rawKeypair.toString('utf8'))

		console.log('Transaction has been submitted');
		
		//disconnect
		await gateway.disconnect();

		resolve(keypair);
		return;
	})
}

module.exports = {
	create,
	shareKeypair,
	getKeypair
}