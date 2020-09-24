/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class User extends Contract {

    async initLedger() {
      
    }

    validateParams(params, count) {
        if(params.length !== count) throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`);
    }

    async getCreatorId(ctx) {
        const rawId = await ctx.stub.invokeChaincode("helper", ["getCreatorId"], "mychannel");
        if (rawId.status !== 200) throw new Error(rawId.message);
        
        return rawId.payload.toString('utf8');
    }

    async getTimestamp(ctx) {
        const rawTs = await ctx.stub.invokeChaincode("helper", ["getTimestamp"], "mychannel");
        if (rawTs.status !== 200) throw new Error(rawTs.message);
        
        return rawTs.payload.toString('utf8');
    }

    async getAllResults(iterator, isHistory, limit = 0) {
		let allResults = [];
		let res = await iterator.next();
		while (!res.done || (allResults.length < limit && limit > 0)) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) {
					jsonRes.TxId = res.value.tx_id;
					jsonRes.Timestamp = res.value.timestamp;
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else {
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
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
    
    async setLastJobAttributionNow(ctx, workers) {
        const timestamp = await this.getTimestamp(ctx);
        let promises = [];
        
        workers.forEach(w => {
            let updatedWorker = {...w.Record, lastJobAttribution: timestamp};
            promises.push(ctx.stub.putState(w.Key, Buffer.from(JSON.stringify(updatedWorker))));
        });

        /* eslint-disable-next-line no-undef */
        return Promise.all(promises);
    }

    // params[0]: count
    async getNextWorkersIds(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const count = params[0];
        const id = await this.getCreatorId(ctx);
        let workersIds = [];
        let workers = [];
        // select KYC workers

        // select non-KYC workers
        if(workersIds.length < count){
            let queryString = {};
            queryString.selector = {
                "$not": {"_id": id},
            };
            queryString.sort = [
                {"lastJobAttribution": "asc"}, 
                {"registryDate": "asc"},
            ];
            
            let limit = Number(count) - workersIds.length;

            // Paginated queries are supported only in a read-only transaction
            // const results = await ctx.stub.getQueryResultWithPagination(JSON.stringify(queryString), limit);

            const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
            const workersNonKyc = await this.getAllResults(resultsIterator, false, limit);

            console.log('===== workersNonKyc COUNT =====', workersNonKyc.length);
            
            workersIds = workersIds.concat(workersNonKyc.map(w => ({_id: w.Key, publicKey: w.Record.publicKey})));
            workers = workers.concat(workersNonKyc);
        }
        
        await this.setLastJobAttributionNow(ctx, workers);

        console.log('=== wordersIds ===', JSON.stringify(workersIds));
        return workersIds;
    }
    
    // PARAMS
    // @ params[0]: username
    // @ params[1]: pubKey
    async createUser(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const existing = await ctx.stub.getStateByPartialCompositeKey('username~id', [params[0]]);
        if(existing.response.results.length > 0) throw new Error(`${params[0]} is already taken.`);

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

        console.info(`=== created user ${JSON.stringify(value)} ===`);
        
        return id;
    }
}

module.exports = User;
