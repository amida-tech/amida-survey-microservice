/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

const SharedIntegration = require('./util/shared-integration.js');
const SurveySuperTest = require('./util/survey-super-test');
const History = require('./util/history');

const config = require('../config');

const expect = chai.expect;

describe('header/cookie login integration', () => {
    const surveySuperTest = new SurveySuperTest();
    const shared = new SharedIntegration(surveySuperTest);
    const hxUser = new History();
    const setup = shared.setUpFn();

    before(shared.setUpFn());

    const verifyJWT = function(index,supertest) {
        return function(end) {
            const token = surveySuperTest.getJWT();
            const user = _.cloneDeep(hxUser.client(index));

            jwt.verify(token, config.jwt.secret, {}, (err, payload) => {
                expect(!err).to.equal(true)
                expect(payload).to.deep.equal(user);
            });
            end();
        }
    }

    it('login as super', shared.loginFn(config.superUser, "cookie"));

    _.range(4).forEach((i) => {
        it(`create user ${i}`, shared.createUserFn(hxUser));
    });

    it('logout as super', shared.logoutFn());

    _.range(4).forEach((i) => {
        it(`login as user ${i}`, shared.loginIndexFn(hxUser, i, "cookie"));
        it(`verify login of user ${i}`, verifyJWT(i, surveySuperTest));
        it(`logout as  user ${i}`, shared.logoutFn());
    });


    it('login as super', shared.loginFn(config.superUser, "header"));

    _.range(4).forEach((i) => {
        it(`create user ${i}`, shared.createUserFn(hxUser));
    });

    it('logout as super', shared.logoutFn());

    _.range(4).forEach((i) => {
        it(`login as user ${i}`, shared.loginIndexFn(hxUser, i, "header"));
        it(`verify login of user ${i}`, verifyJWT(i,surveySuperTest));
        it(`logout as  user ${i}`, shared.logoutFn());
    });

});
