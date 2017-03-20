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
    constructor(generator) {
        this.generator = generator || new Generator();
    }

    setUpFn(store, options = {}) {
        return function (done) {
            const app = appgen.newExpress();
            appgen.initialize(app, options, (err, app) => {
                if (err) {
                    return done(err);
                }
                store.initialize(app);
                return done();
            });
        };
    }

    loginFn(store, login) {
        return function (done) {
            store.authBasic(login).end(done);
        };
    }

    loginIndexFn(store, history, index) {
        const shared = this;
        return function (done) {
            const login = history.client(index);
            login.username = login.username || login.email.toLowerCase();
            shared.loginFn(store, login)(done);
        };
    }

    logoutFn(store) {
        return function () {
            store.resetAuth();
        };
    }

    badLoginFn(store, login) {
        return function (done) {
            store.authBasic(login, 401).end(done);
        };
    }

    createProfileSurveyFn(store, hxSurvey) {
        const generator = this.generator;
        return function (done) {
            const clientSurvey = generator.newSurvey();
            store.post('/profile-survey', clientSurvey, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.push(clientSurvey, res.body);
                    return done();
                });
        };
    }

    verifyProfileSurveyFn(store, hxSurvey, index) {
        return function (done) {
            store.get('/profile-survey', false, 200)
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

    createUserFn(store, history, user, override) {
        const generator = this.generator;
        return function (done) {
            if (!user) {
                user = generator.newUser(override);
            }
            store.post('/users', user, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    history.push(user, { id: res.body.id });
                    return done();
                });
        };
    }

    createSurveyFn(store, hxSurvey, hxQuestion, qxIndices) {
        const generator = this.generator;
        return function (done) {
            const inputSurvey = generator.newSurvey();
            delete inputSurvey.sections;
            if (hxQuestion) {
                inputSurvey.questions = qxIndices.map(index => ({
                    id: hxQuestion.server(index).id,
                    required: false,
                }));
            }
            store.post('/surveys', inputSurvey, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    hxSurvey.push(inputSurvey, res.body);
                    return done();
                });
        };
    }

    createSurveyProfileFn(store, survey) {
        return function (done) {
            store.post('/profile-survey', survey, 201)
                .expect((res) => {
                    expect(!!res.body.id).to.equal(true);
                })
                .end(done);
        };
    }

    createConsentTypeFn(store, history) {
        const generator = this.generator;
        return function (done) {
            const cst = generator.newConsentType();
            store.post('/consent-types', cst, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    history.pushType(cst, res.body);
                    return done();
                });
        };
    }

    createConsentFn(store, hxConsent, hxConsentDocument, typeIndices) {
        const generator = this.generator;
        return function (done) {
            const sections = typeIndices.map(typeIndex => hxConsentDocument.typeId(typeIndex));
            const clientConsent = generator.newConsent({ sections });
            store.post('/consents', clientConsent, 201)
                .expect((res) => {
                    hxConsent.pushWithId(clientConsent, res.body.id);
                })
                .end(done);
        };
    }

    verifyConsentFn(store, hxConsent, index) {
        return function (done) {
            const id = hxConsent.id(index);
            store.get(`/consents/${id}`, true, 200)
                .expect((res) => {
                    const expected = hxConsent.server(index);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        };
    }

    signConsentTypeFn(store, hxConsentDocument, userIndex, typeIndex) {
        return function (done) {
            const consentDocumentId = hxConsentDocument.id(typeIndex);
            hxConsentDocument.sign(typeIndex, userIndex);
            store.post('/consent-signatures', { consentDocumentId }, 201).end(done);
        };
    }

    bulkSignConsentTypeFn(store, hxConsentDocument, userIndex, typeIndices) {
        return function (done) {
            const consentDocumentIds = typeIndices.map(typeIndex => hxConsentDocument.id(typeIndex));
            typeIndices.forEach(typeIndex => hxConsentDocument.sign(typeIndex, userIndex));
            store.post('/consent-signatures/bulk', { consentDocumentIds }, 201).end(done);
        };
    }

    createConsentDocumentFn(store, history, typeIndex) {
        const generator = this.generator;
        return function (done) {
            const typeId = history.typeId(typeIndex);
            const cs = generator.newConsentDocument({ typeId });
            store.post('/consent-documents', cs, 201)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    history.push(typeIndex, cs, res.body);
                    return done();
                });
        };
    }

    translateConsentTypeFn(store, index, language, hxType) {
        return function (done) {
            const server = hxType.server(index);
            const translation = translator.translateConsentType(server, language);
            store.patch(`/consent-types/text/${language}`, translation, 204)
                .end((err) => {
                    if (err) {
                        return done(err);
                    }
                    hxType.translate(index, language, translation);
                    return done();
                });
        };
    }

    translateConsentDocumentFn(store, index, language, history) {
        return function (done) {
            const server = history.server(index);
            const translation = translator.translateConsentDocument(server, language);
            store.patch(`/consent-documents/text/${language}`, translation, 204)
                .end((err) => {
                    if (err) {
                        return done(err);
                    }
                    history.hxDocument.translateWithServer(server, language, translation);
                    return done();
                });
        };
    }

    verifyUserAudit(store) {
        it('login as super', this.loginFn(store, config.superUser));

        it('verify user audit', function vua() {
            const userAudit = store.getUserAudit();
            return store.get('/users', true, 200, { role: 'all' })
                .then(res => new Map(res.body.map(user => [user.username, user.id])))
                .then(userMap => userAudit.map(({ username, operation, endpoint }) => {
                    const userId = userMap.get(username);
                    return { userId, operation, endpoint };
                }))
                .then((expected) => {
                    const px = store.get('/user-audits', true, 200);
                    px.then(resAudit => expect(resAudit.body).to.deep.equal(expected));
                    return px;
                });
        });

        it('logout as super', this.logoutFn(store));
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
