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
const translator = require('./translator');
const comparator = require('./comparator');

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

    createProfileSurveyFn(hxSurvey) {
        const generator = this.generator;
        const surveySuperTest = this.surveySuperTest;
        return function createProfileSurvey(done) {
            const clientSurvey = generator.newSurvey();
            surveySuperTest.post('/profile-survey', clientSurvey, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    const userId = surveySuperTest.userId;
                    const server = { id: res.body.id, authorId: userId };
                    Object.assign(server, clientSurvey);
                    hxSurvey.push(clientSurvey, server);
                    return done();
                });
        };
    }

    verifyProfileSurveyFn(hxSurvey, index) {
        const surveySuperTest = this.surveySuperTest;
        return function verifyProfileSurvey(done) {
            surveySuperTest.get('/profile-survey', false, 200)
                .expect((res) => {
                    expect(res.body.exists).to.equal(true);
                    const survey = res.body.survey;
                    const id = hxSurvey.id(index);
                    expect(survey.id).to.equal(id);
                    const expected = _.cloneDeep(hxSurvey.server(index));
                    if (surveySuperTest.userRole !== 'admin') {
                        delete expected.authorId;
                    }
                    comparator.survey(expected, survey);
                    hxSurvey.updateServer(index, survey);
                })
                .end(done);
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

    createSurveyProfileFn(survey) {
        const surveySuperTest = this.surveySuperTest;
        return function createSurveyProfile(done) {
            surveySuperTest.post('/profile-survey', survey, 201)
                .expect((res) => {
                    expect(!!res.body.id).to.equal(true);
                })
                .end(done);
        };
    }

    createConsentTypeFn(history) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        return function createConsentType(done) {
            const cst = generator.newConsentType();
            surveySuperTest.post('/consent-types', cst, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    history.pushType(cst, res.body);
                    return done();
                });
        };
    }

    createConsentFn(hxConsent, hxConsentDocument, typeIndices) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        return function createConsent(done) {
            const sections = typeIndices.map(typeIndex => hxConsentDocument.typeId(typeIndex));
            const clientConsent = generator.newConsent({ sections });
            surveySuperTest.post('/consents', clientConsent, 201)
                .expect((res) => {
                    hxConsent.pushWithId(clientConsent, res.body.id);
                })
                .end(done);
        };
    }

    verifyConsentFn(hxConsent, index) {
        const surveySuperTest = this.surveySuperTest;
        return function verifyConsent(done) {
            const id = hxConsent.id(index);
            surveySuperTest.get(`/consents/${id}`, true, 200)
                .expect((res) => {
                    const expected = hxConsent.server(index);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        };
    }

    signConsentTypeFn(hxConsentDocument, userIndex, typeIndex) {
        const surveySuperTest = this.surveySuperTest;
        return function signConsentType(done) {
            const consentDocumentId = hxConsentDocument.id(typeIndex);
            hxConsentDocument.sign(typeIndex, userIndex);
            surveySuperTest.post('/consent-signatures', { consentDocumentId }, 201).end(done);
        };
    }

    bulkSignConsentTypeFn(hxConsentDocument, userIndex, typeIndices) {
        const surveySuperTest = this.surveySuperTest;
        return function bulkSignConsentType(done) {
            const consentDocumentIds = typeIndices.map(typeIndex => hxConsentDocument.id(typeIndex));
            typeIndices.forEach(typeIndex => hxConsentDocument.sign(typeIndex, userIndex));
            surveySuperTest.post('/consent-signatures/bulk', { consentDocumentIds }, 201).end(done);
        };
    }

    createConsentDocumentFn(history, typeIndex) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        return function createConsentDocument(done) {
            const typeId = history.typeId(typeIndex);
            const cs = generator.newConsentDocument({ typeId });
            surveySuperTest.post('/consent-documents', cs, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    history.push(typeIndex, cs, res.body);
                    return done();
                });
        };
    }

    translateConsentTypeFn(index, language, hxType) {
        const surveySuperTest = this.surveySuperTest;
        return function translateConsentType(done) {
            const server = hxType.server(index);
            const translation = translator.translateConsentType(server, language);
            surveySuperTest.patch(`/consent-types/text/${language}`, translation, 204)
                .end((err) => {
                    if (err) {
                        return done(err);
                    }
                    hxType.translate(index, language, translation);
                    return done();
                });
        };
    }

    translateConsentDocumentFn(index, language, history) {
        const surveySuperTest = this.surveySuperTest;
        return function translateConsentDocument(done) {
            const server = history.server(index);
            const translation = translator.translateConsentDocument(server, language);
            surveySuperTest.patch(`/consent-documents/text/${language}`, translation, 204)
                .end((err) => {
                    if (err) {
                        return done(err);
                    }
                    history.hxDocument.translateWithServer(server, language, translation);
                    return done();
                });
        };
    }

    verifyUserAudit() {
        const surveySuperTest = this.surveySuperTest;
        it('login as super', this.loginFn(config.superUser));

        it('verify user audit', function vua() {
            const userAudit = surveySuperTest.getUserAudit();
<<<<<<< HEAD
            return surveySuperTest.get('/users', true, 200, { role: 'all' })
                .then(res => new Map(res.body.map(user => [user.username, user.id])))
                .then(userMap => userAudit.map(({ username, operation, endpoint }) => {
                    const userId = userMap.get(username);
                    return { userId, operation, endpoint };
                }))
                .then((expected) => {
                    const px = surveySuperTest.get('/user-audits', true, 200);
                    return px.then(resAudit => expect(resAudit.body).to.deep.equal(expected));
=======
            return surveySuperTest.get('/user-audits', true, 200)
                .then((resAudit) => {
                    expect(resAudit.body).to.deep.equal(userAudit);
>>>>>>> develop
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
