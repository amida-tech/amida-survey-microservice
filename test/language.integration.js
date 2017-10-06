/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const SharedIntegration = require('./util/shared-integration.js');
const SurveySuperTest = require('./util/survey-super-test');

const config = require('../config');

const expect = chai.expect;

describe('language integration', () => {
    const surveySuperTest = new SurveySuperTest();
    const shared = new SharedIntegration(surveySuperTest);
    before(shared.setUpFn());

    let languages;

    const listLanguagesFn = function (done) {
        surveySuperTest.get('/languages', true, 200)
            .expect((res) => {
                expect(res.body).to.deep.equal(languages);
            })
            .end(done);
    };

    it('login as super', shared.loginFn(config.superUser));

    it('list existing languages', (done) => {
        surveySuperTest.get('/languages', true, 200)
            .expect((res) => {
                languages = res.body;
                expect(languages).to.have.length.above(0);
            })
            .end(done);
    });

    const example = {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
    };

    it('create language', (done) => {
        surveySuperTest.post('/languages', example, 201)
            .expect(() => {
                languages.push(example);
                _.sortBy(languages, 'code');
            })
            .end(done);
    });

    it('get language', (done) => {
        surveySuperTest.get(`/languages/${example.code}`, true, 200)
            .expect((res) => {
                expect(res.body).to.deep.equal(example);
            })
            .end(done);
    });

    it('list existing languages', listLanguagesFn);

    it('delete language', (done) => {
        surveySuperTest.delete('/languages/fr', 204)
            .expect(() => {
                _.remove(languages, { code: 'fr' });
            })
            .end(done);
    });

    it('list existing languages', listLanguagesFn);

    it('patch language', (done) => {
        const languageUpdate = { name: 'Turk', nativeName: 'Türk' };
        surveySuperTest.patch('/languages/tr', languageUpdate, 204)
            .expect(() => {
                const language = _.find(languages, { code: 'tr' });
                Object.assign(language, languageUpdate);
            })
            .end(done);
    });

    it('list existing languages', listLanguagesFn);

    shared.verifyUserAudit();
});
