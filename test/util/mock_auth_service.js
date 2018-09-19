'use strict';

const tokener = require('../../lib/tokener');
const config = require('../../config');

const jwtOptions = {};
jwtOptions.secretOrKey = config.jwt.secret;

class AuthService {
    constructor() {
        this.usernameToJWT = {};
    }

    addUser(user) {
        this.usernameToJWT[user.id] = tokener.createJWT(user, jwtOptions.secretOrKey);
    }

    getJWT(user) {
        if (typeof this.usernameToJWT[user.id] !== 'undefined') {
            return this.usernameToJWT[user.id];
        }
        return null;
    }
 }

module.exports = AuthService;
