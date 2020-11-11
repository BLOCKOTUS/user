/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context, Contract } from 'fabric-contract-api';

export class Keypair extends Contract {

    public async initLedger() {
        console.log('initLedger');
    }

    /**
     * Store a shared keypair.
     * 
     * @param sharedWith
     * @param groupId
     * @param myEncryptedKeyPair
     * @param type = 'job'
     */
    public async createSharedKeypair(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 4);

        const id = await this.getCreatorId(ctx);
        const sharedKeyPairId = `${params[3]}||${id}||${params[1]}`;

        // check if the keyapir already exists or not
        const existing = await ctx.stub.getState(sharedKeyPairId);
        if (!existing.toString()) {
            const sharedWith = JSON.parse(params[0]);
            const value = {};
            value[id] = {keypair: params[2], isCreator: true};

            // prepare an object containing the encrypted keypair version of each user who was given a copy
            for (const eUserId in sharedWith) {
                if (sharedWith.hasOwnProperty(eUserId)) {
                    value[eUserId] = {
                        isCreator: false,
                        keypair: sharedWith[eUserId].keypair,
                    };
                }
            }

            // put the object in the ledger
            await ctx.stub.putState(sharedKeyPairId, Buffer.from(JSON.stringify(value)));

            // put the indexes
            const compositeKey = await ctx.stub.createCompositeKey('id~groupId~type', [id, params[1], params[3]]);
            const compositeKeyReverse = await ctx.stub.createCompositeKey('groupId~id~type', [params[1], id, params[3]]);
            await ctx.stub.putState(compositeKey, Buffer.from('\u0000'));
            await ctx.stub.putState(compositeKeyReverse, Buffer.from('\u0000'));
            return;
        } else {
            throw new Error(`${sharedKeyPairId} is already taken.`);
        }
    }

    /**
     * Get a shared keypair.
     * 
     * @param keypairId
     */
    public async getKeypair(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const id = await this.getCreatorId(ctx);
        const sharedKeyPairId = params[0];

        // retrieve object from the ledger
        const rawKeypairObject = await ctx.stub.getState(sharedKeyPairId);
        if (rawKeypairObject.length === 0) { throw new Error(`${sharedKeyPairId} is not valid.`); }

        // parse the object
        const stringKeypairObject = rawKeypairObject.toString();
        const keypairObject = JSON.parse(stringKeypairObject);

        // look for the keypair shared with the user
        if (keypairObject[id] === undefined) { throw new Error(`${sharedKeyPairId} is not shared with you.`); }

        return keypairObject[id].keypair;
    }

    /**
     * Validate the params received as arguments by a public functions.
     * Params are stored in the Context.
     * 
     * @param {string[]} params params received by a pubic function
     * @param {number} count number of params expected
     */
    private validateParams(params, count) {
        if (params.length !== count) { throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`); }
    }

    /**
     * Get the creatorId (transaction submitter unique id) from the Helper organ.
     */
    private async getCreatorId(ctx: Context) {
        const rawId = await ctx.stub.invokeChaincode('helper', ['getCreatorId'], 'mychannel');
        if (rawId.status !== 200) { throw new Error(rawId.message); }

        return rawId.payload.toString();
    }

    /**
     * Get the timestamp from the Helper organ.
     */
    private async getTimestamp(ctx: Context) {
        const rawTs = await ctx.stub.invokeChaincode('helper', ['getTimestamp'], 'mychannel');
        if (rawTs.status !== 200) { throw new Error(rawTs.message); }

        return rawTs.payload.toString();
    }
}
