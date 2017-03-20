/* global it*/

'use strict';

const chai = require('chai');

const config = require('../../config');

const appgen = require('../../app-generator');
const RRError = require('../../lib/rr-error');
const Generator = require('./generator');
const translator = require('./translator');
const comparator = require('./comparator');

const expect = chai.expect;
const unknownError = new RRError('unknown');
const i18n = require('../../i18n');

class SharedIntegration {
    constructor(rrSuperTest, generator) {
        this.generator = generator || new Generator();
        this.rrSuperTest = rrSuperTest;
    }

    setUpFn(options = {}) {
        const rrSuperTest = this.rrSuperTest;
        return function setup(done) {
            appgen.generate(options, (err, app) => {
                if (err) {
                    return done(err);
                }
                rrSuperTest.initialize(app);
                return done();
            });
        };
    }

    loginFn(login) {
        const rrSuperTest = this.rrSuperTest;
        return function loginfn(done) {
            rrSuperTest.authBasic(login).end(done);
        };
    }

    loginIndexFn(history, index) {
        const shared = this;
        return function loginIndex(done) {
            const login = history.client(index);
            login.username = login.username || login.email.toLowerCase();
            shared.loginFn(login)(done);
        };
    }

    logoutFn() {
        const rrSuperTest = this.rrSuperTest;
        return function logout() {
            rrSuperTest.resetAuth();
        };
    }

    badLoginFn(login) {
        const rrSuperTest = this.rrSuperTest;
        return function badLogin() {
            return rrSuperTest.authBasic(login, 401);
        };
    }

    createProfileSurveyFn(hxSurvey) {
        const generator = this.generator;
        const rrSuperTest = this.rrSuperTest;
        return function createProfileSurvey(done) {
            const clientSurvey = generator.newSurvey();
            rrSuperTest.post('/profile-survey', clientSurvey, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.push(clientSurvey, res.body);
                    return done();
                });
        };
    }

    verifyProfileSurveyFn(hxSurvey, index) {
        const rrSuperTest = this.rrSuperTest;
        return function verifyProfileSurvey(done) {
            rrSuperTest.get('/profile-survey', false, 200)
                .expect((res) => {
                    expect(res.body.exists).to.equal(true);
                    const survey = res.body.survey;
                    const id = hxSurvey.id(index);
                    expect(survey.id).to.equal(id);
                    hxSurvey.updateServer(index, survey);
                    comparator.survey(hxSurvey.client(index), survey);
                })
                .end(done);
        };
    }

    createUserFn(history, user, override) {
        const generator = this.generator;
        const rrSuperTest = this.rrSuperTest;
        return function createUser(done) {
            if (!user) {
                user = generator.newUser(override);
            }
            rrSuperTest.post('/users', user, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    history.push(user, { id: res.body.id });
                    return done();
                });
        };
    }

    createSurveyFn(hxSurvey, hxQuestion, qxIndices) {
        const generator = this.generator;
        const rrSuperTest = this.rrSuperTest;
        return function createSurvey(done) {
            const inputSurvey = generator.newSurvey();
            delete inputSurvey.sections;
            if (hxQuestion) {
                inputSurvey.questions = qxIndices.map(index => ({
                    id: hxQuestion.server(index).id,
                    required: false,
                }));
            }
            rrSuperTest.post('/surveys', inputSurvey, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.push(inputSurvey, res.body);
                    return done();
                });
        };
    }

    createSurveyProfileFn(survey) {
        const rrSuperTest = this.rrSuperTest;
        return function createSurveyProfile(done) {
            rrSuperTest.post('/profile-survey', survey, 201)
                .expect((res) => {
                    expect(!!res.body.id).to.equal(true);
                })
                .end(done);
        };
    }

    createConsentTypeFn(history) {
        const rrSuperTest = this.rrSuperTest;
        const generator = this.generator;
        return function createConsentType(done) {
            const cst = generator.newConsentType();
            rrSuperTest.post('/consent-types', cst, 201)
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
        const rrSuperTest = this.rrSuperTest;
        const generator = this.generator;
        return function createConsent(done) {
            const sections = typeIndices.map(typeIndex => hxConsentDocument.typeId(typeIndex));
            const clientConsent = generator.newConsent({ sections });
            rrSuperTest.post('/consents', clientConsent, 201)
                .expect((res) => {
                    hxConsent.pushWithId(clientConsent, res.body.id);
                })
                .end(done);
        };
    }

    verifyConsentFn(hxConsent, index) {
        const rrSuperTest = this.rrSuperTest;
        return function verifyConsent(done) {
            const id = hxConsent.id(index);
            rrSuperTest.get(`/consents/${id}`, true, 200)
                .expect((res) => {
                    const expected = hxConsent.server(index);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        };
    }

    signConsentTypeFn(hxConsentDocument, userIndex, typeIndex) {
        const rrSuperTest = this.rrSuperTest;
        return function signConsentType(done) {
            const consentDocumentId = hxConsentDocument.id(typeIndex);
            hxConsentDocument.sign(typeIndex, userIndex);
            rrSuperTest.post('/consent-signatures', { consentDocumentId }, 201).end(done);
        };
    }

    bulkSignConsentTypeFn(hxConsentDocument, userIndex, typeIndices) {
        const rrSuperTest = this.rrSuperTest;
        return function bulkSignConsentType(done) {
            const consentDocumentIds = typeIndices.map(typeIndex => hxConsentDocument.id(typeIndex));
            typeIndices.forEach(typeIndex => hxConsentDocument.sign(typeIndex, userIndex));
            rrSuperTest.post('/consent-signatures/bulk', { consentDocumentIds }, 201).end(done);
        };
    }

    createConsentDocumentFn(history, typeIndex) {
        const rrSuperTest = this.rrSuperTest;
        const generator = this.generator;
        return function createConsentDocument(done) {
            const typeId = history.typeId(typeIndex);
            const cs = generator.newConsentDocument({ typeId });
            rrSuperTest.post('/consent-documents', cs, 201)
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
        const rrSuperTest = this.rrSuperTest;
        return function translateConsentType(done) {
            const server = hxType.server(index);
            const translation = translator.translateConsentType(server, language);
            rrSuperTest.patch(`/consent-types/text/${language}`, translation, 204)
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
        const rrSuperTest = this.rrSuperTest;
        return function translateConsentDocument(done) {
            const server = history.server(index);
            const translation = translator.translateConsentDocument(server, language);
            rrSuperTest.patch(`/consent-documents/text/${language}`, translation, 204)
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
        const rrSuperTest = this.rrSuperTest;
        it('login as super', this.loginFn(config.superUser));

        it('verify user audit', function vua() {
            const userAudit = rrSuperTest.getUserAudit();
            return rrSuperTest.get('/users', true, 200, { role: 'all' })
                .then(res => new Map(res.body.map(user => [user.username, user.id])))
                .then(userMap => userAudit.map(({ username, operation, endpoint }) => {
                    const userId = userMap.get(username);
                    return { userId, operation, endpoint };
                }))
                .then((expected) => {
                    const px = rrSuperTest.get('/user-audits', true, 200);
                    px.then(resAudit => expect(resAudit.body).to.deep.equal(expected));
                    return px;
                });
        });

        it('logout as super', this.logoutFn());
    }

    verifyErrorMessage(res, code, ...params) {
        const req = {};
        const response = {};
        i18n.init(req, response);
        const expected = (new RRError(code, ...params)).getMessage(response);
        expect(expected).to.not.equal(code);
        expect(expected).to.not.equal(unknownError.getMessage(response));
        expect(res.body.message).to.equal(expected);
    }

    verifyErrorMessageLang(res, language, code, ...params) {
        const req = { url: `http://aaa.com/anything?language=${language}` };
        const response = {};
        i18n.init(req, response);
        const expected = (new RRError(code, ...params)).getMessage(response);
        expect(expected).to.not.equal(code);
        expect(expected).to.not.equal(unknownError.getMessage(response));
        expect(res.body.message).to.equal(expected);
    }
}

module.exports = SharedIntegration;
