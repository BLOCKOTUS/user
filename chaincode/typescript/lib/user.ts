/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context } from 'fabric-contract-api';
import { BlockotusContract } from 'hyperledger-fabric-chaincode-helper';

type CreatorId = string;
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
        const params = this.getParams(ctx, { length: 2 });

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
        const params = this.getParams(ctx);
        const userId: CreatorId = params.length === 1 ? params[0] : this.getUniqueClientId(ctx);

        // get user
        return await this.didGet(ctx, userId);
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
        const params = this.getParams(ctx, { length: 1 });

        const count = Number(params[0]);
        const id = this.getUniqueClientId(ctx);

        const SAMPLE_FACTOR_SIZE = 1;

        let workersIds = [];
        let workers = [];
        let workersNonKyc = [];

        // TODO: select KYC workers

        // select non-KYC workers
        if (workersIds.length < count) {
            const limitReal = count - workersIds.length;
            const limitSample = limitReal * SAMPLE_FACTOR_SIZE;

            const queryString = {
                selector: {
                    $not: { _id: id },
                },
                sort: [
                    { lastJobAttribution: 'asc' },
                    { registryDate: 'asc' },
                ],
            };

            // Paginated queries are supported only in a read-only transaction
            // const results = await ctx.stub.getQueryResultWithPagination(JSON.stringify(queryString), limit);
            const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
            const workersNonKycSample = await this.getAllResultsFromIterator(resultsIterator, false, limitSample);

            const sampleRealLength = workersNonKycSample.length;
            const ratioSize = Math.ceil(sampleRealLength / limitReal);

            workersNonKyc = workersNonKycSample
                .map((w, i) => i % ratioSize === 0 ? w : null)
                .filter((o, i) => o !== null)
                .filter((o, i) => i < limitReal);

            workersIds = workersIds.concat(workersNonKyc.map((w) => ({_id: w.Key, publicKey: w.Record.publicKey})));
            workers = workers.concat(workersNonKyc);
        }

        await this.setLastJobAttributionNow(ctx, workers);

        return workersIds;
    }
}
