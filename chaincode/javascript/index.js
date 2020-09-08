'use strict';

const User = require('./lib/user.js');
const Keypair = require('./lib/keypair.js');

module.exports.User = User;
module.exports.Keypair = Keypair;
module.exports.contracts = [ User, Keypair ];