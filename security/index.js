'use strict';

const config = require('../config');

const jwt = require('jsonwebtoken');

const invalidAuth = {
    message: 'Invalid authorization',
    code: 'invalid_auth',
    statusCode: 401,
};

const noAuth = {
    message: 'No authorization',
    code: 'no_auth',
    statusCode: 401,
};

const jwtAuth = function (req, header, callback) {
    if (header) {
        const matches = header.match(/(\S+)\s+(\S+)/);
        if (matches && matches[1] === 'Bearer') {
            const token = matches[2];

            return jwt.verify(token, config.jwt.secret, {}, (err, payload) => {
                if (err) {
                    return callback(invalidAuth);
                }
                return req.models.auth.getUser(payload)
                    .then((user) => {
                        if (user) {
                            req.user = user;
                            return callback(null);
                        }
                        return callback(null);
                    });
            });
        }
        return callback(invalidAuth);
    }
    return callback(noAuth);
};


module.exports = {
    invalidAuth,
    noAuth,
    self(req, def, header, callback) {
        jwtAuth(req, header, callback);
    },
    any(req, def, header, callback) {
        jwtAuth(req, header, function nullFunction() {
            callback(null);
        });
    },
};
