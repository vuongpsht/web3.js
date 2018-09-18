/*
    This file is part of web3.js.

    web3.js is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    web3.js is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/
/**
 * @file Batch.js
 * @author Samuel Furter <samuel@ethereum.org>, Marek Kotewicz <marek@ethdev.com>
 * @date 2018
 */

"use strict";

var errors = require('web3-core-helpers').errors;
var _ = require('underscore');

/**
 *
 * @param {AbstractProviderAdapter} provider
 * @param {JSONRpcMapper} jsonRpcMapper
 * @param {JSONRpcResponseValidator} jsonRpcResponseValidator
 *
 * @constructor
 */
function Batch(provider, jsonRpcMapper, jsonRpcResponseValidator) {
    this.provider = provider;
    this.jsonRpcMapper = jsonRpcMapper;
    this.jsonRpcResponseValidator = jsonRpcResponseValidator;
    this.requests = [];
}

/**
 * Should be called to add create new request to batch request
 *
 * @method add
 *
 * @param {Object} request
 */
Batch.prototype.add = function (request) {
    this.requests.push(request);
};

/**
 * Should be called to execute batch request
 *
 * @method execute
 */
Batch.prototype.execute = function () {
    var self = this;
    this.provider.sendBatch(
        this.jsonRpcMapper.toBatchPayload(this.requests),
        function (err, results) {
            self.requests.forEach(function (request, index) {
                var result = results[index] || null;

                if (_.isFunction(request.callback)) {
                    if (_.isObject(result) && result.error) {
                        request.callback(errors.ErrorResponse(result));
                    }

                    if (!this.jsonRpcResponseValidator.isValid(result)) {
                        request.callback(errors.InvalidResponse(result));
                    }

                    try {
                        var mappedResult = result.result;

                        if (self.hasOutputFormatter(request)) {
                            mappedResult = request.methodModel.outputFormatter(mappedResult);
                        }

                        request.callback(null, mappedResult);

                    } catch (err) {
                        request.callback(err, null);
                    }
                }
            });
        }
    );
};

/**
 * Checks if the method has an outputFormatter defined
 *
 * @method hasOutputFormatter
 *
 * @param {Object} request
 *
 * @returns {Boolean}
 */
Batch.prototype.hasOutputFormatter = function (request) {
    return _.isFunction(request.methodModel.outputFormatter);
};

module.exports = Batch;
