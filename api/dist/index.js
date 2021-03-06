"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

require("core-js/modules/es.array.join.js");

require("core-js/modules/es.date.to-string.js");

require("core-js/modules/es.object.to-string.js");

require("core-js/modules/es.promise.js");

require("core-js/modules/es.regexp.to-string.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.get = exports.create = void 0;

require("regenerator-runtime/runtime.js");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var registerUser = _interopRequireWildcard(require("../../../../tools/admins/dist/registerUser.js"));

var _index = require("../../../helper/api/dist/index.js");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var WALLET_PATH = _path["default"].join(__dirname, '..', '..', '..', '..', 'wallet');
/**
 * Creates a user on the network.
 * Each user has a `username` and a `publicKey`.
 */


var create = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(_ref) {
    var username, publicKey;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            username = _ref.username, publicKey = _ref.publicKey;
            return _context2.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(resolve, reject) {
                var appUser, wallet, _yield$getContractAnd, contract, gateway, id;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.next = 2;
                        return registerUser.main(username)["catch"](reject);

                      case 2:
                        appUser = _context.sent;

                        if (appUser) {
                          _context.next = 5;
                          break;
                        }

                        return _context.abrupt("return");

                      case 5:
                        // get identity
                        wallet = JSON.parse(_fs["default"].readFileSync(_path["default"].join(WALLET_PATH, "".concat(username, ".id"))).toString()); // register username

                        _context.next = 8;
                        return (0, _index.getContractAndGateway)({
                          user: {
                            wallet: wallet,
                            username: username
                          },
                          chaincode: 'user',
                          contract: 'User'
                        })["catch"](reject);

                      case 8:
                        _yield$getContractAnd = _context.sent;
                        contract = _yield$getContractAnd.contract;
                        gateway = _yield$getContractAnd.gateway;

                        if (!(!contract || !gateway)) {
                          _context.next = 13;
                          break;
                        }

                        return _context.abrupt("return");

                      case 13:
                        _context.next = 15;
                        return contract.submitTransaction('createUser', username, publicKey)["catch"](reject);

                      case 15:
                        id = _context.sent;
                        _context.next = 18;
                        return gateway.disconnect();

                      case 18:
                        if (!id) {
                          reject();
                        } else {
                          resolve({
                            wallet: wallet,
                            id: id.toString()
                          });
                        }

                        return _context.abrupt("return");

                      case 20:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x2, _x3) {
                return _ref3.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function create(_x) {
    return _ref2.apply(this, arguments);
  };
}();
/**
 * Retrieves a user from the network.
 */


exports.create = create;

var get = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(_ref4) {
    var user;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            user = _ref4.user;
            return _context4.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(resolve, reject) {
                var walletPath, _yield$getContractAnd2, contract, gateway, response, parsedResponse;

                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        // create wallet
                        walletPath = _path["default"].join(WALLET_PATH, "".concat(user.username, ".id"));

                        _fs["default"].writeFileSync(walletPath, JSON.stringify(user.wallet)); // get contract, submit transaction and disconnect


                        _context3.next = 4;
                        return (0, _index.getContractAndGateway)({
                          user: user,
                          chaincode: 'user',
                          contract: 'User'
                        })["catch"](reject);

                      case 4:
                        _yield$getContractAnd2 = _context3.sent;
                        contract = _yield$getContractAnd2.contract;
                        gateway = _yield$getContractAnd2.gateway;

                        if (!(!contract || !gateway)) {
                          _context3.next = 9;
                          break;
                        }

                        return _context3.abrupt("return");

                      case 9:
                        _context3.next = 11;
                        return contract.submitTransaction('getUser')["catch"](reject);

                      case 11:
                        response = _context3.sent;
                        _context3.next = 14;
                        return gateway.disconnect();

                      case 14:
                        if (response) {
                          _context3.next = 16;
                          break;
                        }

                        return _context3.abrupt("return");

                      case 16:
                        parsedResponse = JSON.parse(response.toString('utf8'));
                        resolve(parsedResponse);
                        return _context3.abrupt("return");

                      case 19:
                      case "end":
                        return _context3.stop();
                    }
                  }
                }, _callee3);
              }));

              return function (_x5, _x6) {
                return _ref6.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));

  return function get(_x4) {
    return _ref5.apply(this, arguments);
  };
}();

exports.get = get;