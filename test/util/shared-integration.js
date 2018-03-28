/* global it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const chai = require('chai');
const _ = require('lodash');

const config = require('../../config');

const appgen = require('../../app-generator');
const models = require('../../models');
const SurveyError = require('../../lib/survey-error');
const Generator = require('./generator');
// const translator = require('./translator');
// const comparator = require('./comparator');

const expect = chai.expect;
const unknownError = new SurveyError('unknown');
const i18n = require('../../i18n');

class SharedIntegration {
    constructor(surveySuperTest, generator) {
        this.generator = generator || new Generator();
        this.surveySuperTest = surveySuperTest;
    }

    setUpFn(options) {
        const surveySuperTest = this.surveySuperTest;
        return function setup(done) {
            appgen.generate(options || { models }, (err, app) => {
                if (err) {
                    return done(err);
                }
                surveySuperTest.initialize(app);
                return done();
            });
        };
    }

    static setUpMultiFn(surveySuperTests, options = {}) {
        return function setupMulti(done) {
            appgen.generate(options, (err, app) => {
                if (err) {
                    return done(err);
                }
                surveySuperTests.forEach(surveySuperTest => surveySuperTest.initialize(app));
                return done();
            });
        };
    }

    setUpErrFn(options = {}) { // eslint-disable-line class-methods-use-this
        return function setupErr(done) {
            appgen.generate(options, (err) => {
                if (!err) {
                    return done(new Error('Expected error did not happen.'));
                }
                return done();
            });
        };
    }

    loginFn(user, method = 'cookie') {
        const surveySuperTest = this.surveySuperTest;
        return function login() {
            const fullUser = Object.assign({ id: 1, role: 'admin' }, user);
            return surveySuperTest.authBasic(fullUser, 200, method);
        };
    }


    loginIndexFn(hxUser, index, method = 'cookie') {
        const self = this;
        return function loginIndex() {
            const user = _.cloneDeep(hxUser.client(index));
            user.username = user.username || user.email.toLowerCase();
            user.id = hxUser.id(index);
            return self.surveySuperTest.authBasic(user, 200, method);
        };
    }

    logoutFn() {
        const surveySuperTest = this.surveySuperTest;
        return function logout() {
            surveySuperTest.resetAuth();
        };
    }

    badLoginFn(login) {
        const surveySuperTest = this.surveySuperTest;
        return function badLogin() {
            return surveySuperTest.authBasic(login, 401);
        };
    }


    createUserFn(history, user, override) {
        const generator = this.generator;
        const surveySuperTest = this.surveySuperTest;
        return function createUser() {
            if (!user) {
                user = generator.newUser(override);
            }
            surveySuperTest.authService.addUser(user);
            history.push(user, { id: history.clients.length + 2 });
        };
    }

    verifyUserAudit() {
        const surveySuperTest = this.surveySuperTest;
        it('login as super', this.loginFn(config.superUser));

        it('verify user audit', function vua() {
            const userAudit = surveySuperTest.getUserAudit();

            return surveySuperTest.get('/user-audits', true, 200)
                .then((resAudit) => {
                    expect(resAudit.body).to.deep.equal(userAudit);
                });
        });

        it('logout as super', this.logoutFn());
    }

    verifyErrorMessage(res, code, ...params) { // eslint-disable-line class-methods-use-this
        const req = {};
        const response = {};
        i18n.init(req, response);
        const expected = (new SurveyError(code, ...params)).getMessage(response);
        expect(expected).to.not.equal(code);
        expect(expected).to.not.equal(unknownError.getMessage(response));
        expect(res.body.message).to.equal(expected);
    }

    verifyErrorMessageLang(res, language, code, ...params) { // eslint-disable-line class-methods-use-this
        const req = { url: `http://aaa.com/anything?language=${language}` };
        const response = {};
        i18n.init(req, response);
        const expected = (new SurveyError(code, ...params)).getMessage(response);
        expect(expected).to.not.equal(code);
        expect(expected).to.not.equal(unknownError.getMessage(response));
        expect(res.body.message).to.equal(expected);
    }
}

module.exports = SharedIntegration;
