/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const chai = require('chai');
const sinon = require('sinon');

const SharedIntegration = require('./util/shared-integration.js');
const SurveySuperTest = require('./util/survey-super-test');

const models = require('../models');
const config = require('../config');
const SPromise = require('../lib/promise');

const language = models.language;

const expect = chai.expect;

describe('shared integration', () => {
    const surveySuperTest = new SurveySuperTest();
    const shared = new SharedIntegration(surveySuperTest);

    before(shared.setUpFn());

    it('error: unknown end point', (done) => {
        surveySuperTest.get('/xxxxxxx', false, 404).end(done);
    });

    it('login as super', shared.loginFn(config.superUser));

    it('error: unexpected run time error', (done) => {
        sinon.stub(language, 'listLanguages', function listLanguages() {
            return SPromise.reject(new Error('unexpected error'));
        });
        surveySuperTest.get('/languages', true, 500)
            .expect((res) => {
                expect(res.body.message).to.deep.equal('unexpected error');
                language.listLanguages.restore();
            })
            .end(done);
    });

    it('error: unknown end point (authorized)', (done) => {
        surveySuperTest.get('/unknown', true, 404).end(done);
    });

    it('logout as super', shared.logoutFn());
});
