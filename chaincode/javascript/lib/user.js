/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class User extends Contract {

    async initLedger() {
      
    }

    /**
     * Validate the params received as arguments by a public functions.
     * Params are stored in the Context.
     * 
     * @param {string[]} params params received by a pubic function
     * @param {number} count number of params expected
     */
    validateParams(params, count) {
        if(params.length !== count) throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`);
    }

    /**
     * Get the creatorId (transaction submitter unique id) from the Helper organ.
     */
    async getCreatorId(ctx) {
        const rawId = await ctx.stub.invokeChaincode("helper", ["getCreatorId"], "mychannel");
        if (rawId.status !== 200) throw new Error(rawId.message);
        
        return rawId.payload.toString('utf8');
    }

    /**
     * Get the timestamp from the Helper organ.
     */
    async getTimestamp(ctx) {
        const rawTs = await ctx.stub.invokeChaincode("helper", ["getTimestamp"], "mychannel");
        if (rawTs.status !== 200) throw new Error(rawTs.message);
        
        return rawTs.payload.toString('utf8');
    }

    /**
     * Retrieve results from an interator.
     * Construct an array, and can respect a length limit.
     */
    async getAllResults(iterator, isHistory, limit = 0) {
		let allResults = [];
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
				allResults.length < limit ? allResults.push(jsonRes) : null;
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
    }
    
    /**
     * Update an array of users object and set the `lastJobAttribution` as of now.
     */
    async setLastJobAttributionNow(ctx, workers) {
        const timestamp = await this.getTimestamp(ctx);
        let promises = [];
        
        workers.forEach(w => {
            // create a new object with the update `lastJobAttribution` value, then put it on the ledger
            let updatedWorker = {...w.Record, lastJobAttribution: timestamp};
            promises.push(ctx.stub.putState(w.Key, Buffer.from(JSON.stringify(updatedWorker))));
        });

        return Promise.all(promises);
    }

    /**
     * Select users that will be affected to a job.
     */
    async getNextWorkersIds(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const count = params[0];
        const id = await this.getCreatorId(ctx);
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
    
    /**
     * Create a user.
     * 
     * @param username
     * @param pubKey
     */
    async createUser(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const existing = await ctx.stub.getStateByPartialCompositeKey('username~id', [params[0]]);
        const response = await existing.next();
        if (!response.done) { throw new Error(`${params[0]} already exists.`); }

        // construct user object
        const id = await this.getCreatorId(ctx);
        const registryDate = await this.getTimestamp(ctx);
        const value = {
            username: params[0],
            registryDate: Number(registryDate),
            publicKey: params[1],
            lastJobAttribution: 0,
            kyc: false,
        };

        // put state
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(value)));
        
        // create a composite key for easier search
        const indexUsername = await ctx.stub.createCompositeKey('username~id', [value.username, id]);
        await ctx.stub.putState(indexUsername, Buffer.from('\u0000'));
        
        // create a composite key for easier search
        const indexRegistryDate = await ctx.stub.createCompositeKey('registryDate~id', [registryDate, id]);
        await ctx.stub.putState(indexRegistryDate, Buffer.from('\u0000'));

        return id;
    }
}

module.exports = User;
