/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context, Contract } from 'fabric-contract-api';

export class Keypair extends Contract {

    public async initLedger() {
        console.log('initLedger');
    }

    // @ params[0]: sharedWith { ...userId: { keypair } } // stringified
    // @ params[1]: groupId
    // @ params[2]: myEncryptedKeyPair
    // @ params[3]: type = 'job'
    public async createSharedKeypair(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 4);

        const id = await this.getCreatorId(ctx);
        const sharedKeyPairId = `${params[3]}||${id}||${params[1]}`;
        const compositeKey = await ctx.stub.createCompositeKey('id~groupId~type', [id, params[1], params[3]]);
        const compositeKeyReverse = await ctx.stub.createCompositeKey('groupId~id~type', [params[1], id], params[3]);

        const existing = await ctx.stub.getState(sharedKeyPairId);
        if (!existing.toString()) {
            const sharedWith = JSON.parse(params[0]);
            const value = {};
            value[id] = {keypair: params[2], isCreator: true};

            for (const eUserId in sharedWith) {
                if (sharedWith.hasOwnProperty(eUserId)) {
                    value[eUserId] = {
                        isCreator: false,
                        keypair: sharedWith[eUserId].keypair,
                    };
                }
            }

            await ctx.stub.putState(sharedKeyPairId, Buffer.from(JSON.stringify(value)));
            await ctx.stub.putState(compositeKey, Buffer.from('\u0000'));
            await ctx.stub.putState(compositeKeyReverse, Buffer.from('\u0000'));

            console.info(`=== created keypair ${JSON.stringify(value)} ===`);
        } else {
            throw new Error(`${compositeKey} is already taken.`);
        }
    }

    // @ params[0]: keypairId
    public async getKeypair(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const id = await this.getCreatorId(ctx);
        const sharedKeyPairId = params[0];

        const rawKeypairObject = await ctx.stub.getState(sharedKeyPairId);

        if (rawKeypairObject.length === 0) { throw new Error(`${sharedKeyPairId} is not valid.`); }

        const stringKeypairObject = rawKeypairObject.toString();
        const keypairObject = JSON.parse(stringKeypairObject);

        if (keypairObject[id] === undefined) { throw new Error(`${sharedKeyPairId} is not shared with you.`); }

        console.info(`=== keypair ${JSON.stringify(keypairObject[id])} ===`);

        return keypairObject[id].keypair;
    }

    private validateParams(params, count) {
        if (params.length !== count) { throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`); }
    }

    private async getCreatorId(ctx: Context) {
        const rawId = await ctx.stub.invokeChaincode('helper', ['getCreatorId'], 'mychannel');
        if (rawId.status !== 200) { throw new Error(rawId.message); }

        return rawId.payload.toString();
    }

    private async getTimestamp(ctx: Context) {
        const rawTs = await ctx.stub.invokeChaincode('helper', ['getTimestamp'], 'mychannel');
        if (rawTs.status !== 200) { throw new Error(rawTs.message); }

        return rawTs.payload.toString();
    }
}
