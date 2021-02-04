/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context } from 'fabric-contract-api';
import { BlockotusContract } from 'hyperledger-fabric-chaincode-helper';

export class User extends BlockotusContract {

    constructor(...args) {
        super(...args);
    }

    public async initLedger() {
        console.log('initLedger');
    }

    /**
     * Cross-contract invokeChaincode() does not support Parent Contract method as far as I know.
     * This is why we duplicate the method here.
     * Because the method is called from Did contract https://github.com/BLOCKOTUS/did
     */
    public async did(ctx: Context, subject: string, method: string, data: string): Promise<string> {
        return this.didRequest(ctx, subject, method, data);
    }

    /**
     * Create a user.
     * 
     * @param {Context} ctx
     * @arg username
     * @arg pubKey
     */
    public async createUser(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const existing = await ctx.stub.getStateByPartialCompositeKey('username~id', [params[0]]);
        const response = await existing.next();
        if (!response.done) { throw new Error(`${params[0]} already exists.`); }

        // construct user object
        const id = this.getUniqueClientId(ctx);
        const registryDate = this.getTimestamp(ctx);
        const value = {
            lastJobAttribution: Number(0),
            publicKey: params[1],
            registryDate: Number(registryDate),
            username: params[0],
        };

        // put the user object on the ledger
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(value)));

        // create a composite key for easier search
        const indexUsername = await ctx.stub.createCompositeKey('username~id', [value.username, id]);
        await ctx.stub.putState(indexUsername, Buffer.from('\u0000'));

        // create a composite key for easier search
        const indexRegistryDate = await ctx.stub.createCompositeKey('registryDate~id', [registryDate.toString(), id]);
        await ctx.stub.putState(indexRegistryDate, Buffer.from('\u0000'));

        return id;
    }

    /**
     * Get a user.
     * 
     * @param {Context} ctx
     * @arg {string} key
     */
    public async getUser(ctx: Context): Promise<string> {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        // get userId from function argument
        const userId = params[0];

        // get user
        return await this.didGet(ctx, userId);
    }

    /**
     * Validate the params received as arguments by a public functions.
     * Params are stored in the Context.
     * 
     * @param {string[]} params params received by a pubic function
     * @param {number} count number of params expected
     */
    private validateParams(params: Array<string>, count: number) {
        if (params.length !== count) { throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`); }
    }

    /**
     * Retrieve results from an interator.
     * Construct an array, and can respect a length limit.
     */
    private async getAllResults(iterator, isHistory, limit = 0) {
        const allResults = [];
        let res = await iterator.next();
        while (!res.done || (allResults.length < limit && limit > 0)) {
            if (res.value && res.value.value.toString()) {
                const jsonRes = {
                    Key: null,
                    TxId: null,
                    Timestamp: null,
                    Value: null,
                    Record: null,
                };
                if (isHistory && isHistory === true) {
                    jsonRes.TxId = res.value.tx_id;
                    jsonRes.Timestamp = res.value.timestamp;
                    try {
                        jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        jsonRes.Value = res.value.value.toString('utf8');
                    }
                } else {
                    jsonRes.Key = res.value.key;
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }
                if (allResults.length < limit) { allResults.push(jsonRes); }
            }
            res = await iterator.next();
        }
        iterator.close();
        return allResults;
    }

    /**
     * Update an array of users object and set the `lastJobAttribution` as of now.
     */
    private async setLastJobAttributionNow(ctx: Context, workers) {
        const timestamp = this.getTimestamp(ctx);
        const promises = [];

        workers.forEach((w) => {
            // create a new object with the update `lastJobAttribution` value, then put it on the ledger
            const updatedWorker = {...w.Record, lastJobAttribution: Number(timestamp)};
            promises.push(ctx.stub.putState(w.Key, Buffer.from(JSON.stringify(updatedWorker))));
        });

        return Promise.all(promises);
    }

    /**
     * Select users that will be affected to a job.
     */
    private async getNextWorkersIds(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const count = Number(params[0]);
        const id = this.getUniqueClientId(ctx);
        let workersIds = [];
        let workers = [];

        // TODO: select KYC workers

        // select non-KYC workers
        if (workersIds.length < count) {
            const queryString = {
                selector: {
                    $not: { _id: id },
                },
                sort: [
                    { lastJobAttribution: 'asc' },
                    { registryDate: 'asc' },
                ],
            };

            const limit = count - workersIds.length;

            // Paginated queries are supported only in a read-only transaction
            // const results = await ctx.stub.getQueryResultWithPagination(JSON.stringify(queryString), limit);
            const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
            const workersNonKyc = await this.getAllResults(resultsIterator, false, limit);

            workersIds = workersIds.concat(workersNonKyc.map((w) => ({_id: w.Key, publicKey: w.Record.publicKey})));
            workers = workers.concat(workersNonKyc);
        }

        await this.setLastJobAttributionNow(ctx, workers);

        return workersIds;
    }
}
