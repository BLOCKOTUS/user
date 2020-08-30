/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const User = require('./lib/user');
const Keypair = require('./lib/keypair');

module.exports.User = User;
module.exports.Keypair = Keypair;
module.exports.contracts = [ User, Keypair ];
