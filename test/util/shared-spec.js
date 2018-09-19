'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const chai = require('chai');
const _ = require('lodash');
const sinon = require('sinon');
const request = require('request');
const AuthService = require('./mock_auth_service');
const models = require('../../models');

const SurveyError = require('../../lib/survey-error');
const Generator = require('./generator');
// const translator = require('./translator');
// const comparator = require('./comparator');

const expect = chai.expect;

class SharedSpec {
    constructor(generator, inputModels) {
        this.models = inputModels || models;
        this.generator = generator || new Generator();
        this.authService = new AuthService();
    }

    setUpFn(force = true) {
        const m = this.models;
        return function setUp() {
            return m.sequelize.sync({ force });
        };
    }

    createUserFn(hxUser, override) {
        const generator = this.generator;
        const authService = this.authService;
        return function createUser() {
            const user = generator.newUser(override);
            authService.addUser(user);
            hxUser.push(user, { id: hxUser.clients.length + 2 });
        };
    }

    authenticateUserFn(hxUser, index) {
        const m = this.models;
        return function authenticateUser() {
            const client = hxUser.client(index);
            const username = client.username || client.email;
            return m.auth.authenticateUser(username, client.password);
        };
    }

    throwingHandler() { // eslint-disable-line class-methods-use-this
        throw new Error('Unexpected no error.');
    }

    expectedErrorHandler(code, ...params) { // eslint-disable-line class-methods-use-this
        return function expectedErrorHandler(err) {
            if (!(err instanceof SurveyError)) {
                console.log(err); // eslint-disable-line no-console
            }
            expect(err).to.be.instanceof(SurveyError);
            expect(err.code).to.equal(code);
            expect(err.params).to.deep.equal(params);
            return err;
        };
    }

    expectedSeqErrorHandler(name, fields) { // eslint-disable-line class-methods-use-this
        return function expectedSeqErrorHandler(err) {
            expect(err.name).to.equal(name);
            expect(err.fields).to.deep.equal(fields);
            return err;
        };
    }

    sanityEnoughUserTested(hxUser) { // eslint-disable-line class-methods-use-this
        return function sanityEnoughUserTested() {
            const userCount = hxUser.length();
            const counts = _.range(userCount).reduce((r, index) => {
                if (hxUser.client(index).username) {
                    r.username += 1;
                } else {
                    r.email += 1;
                }
                return r;
            }, { username: 0, email: 0 });
            expect(counts.username).to.be.above(0);
            expect(counts.email).to.be.above(0);
        };
    }

    stubRequestGet(error, data) { // eslint-disable-line class-methods-use-this
        return sinon.stub(request, 'get', (opts, callback) => {
            if (typeof opts === 'function') { callback = opts; }
            if (error) {
                return callback(typeof error === 'function' ? error() : error, data);
            }
            return callback(null, typeof data === 'function' ? data() : data);
        });
    }

    stubRequestPost(error, data) { // eslint-disable-line class-methods-use-this
        return sinon.stub(request, 'post', (opts, callback) => {
            if (typeof opts === 'function') { callback = opts; }
            if (error) {
                return callback(typeof error === 'function' ? error() : error, data);
            }
            return callback(null, typeof data === 'function' ? data() : data);
        });
    }
}

module.exports = SharedSpec;
