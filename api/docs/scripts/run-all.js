'use strict';

const models = require('../../models');

const authentication01 = require('./authentication-01');
const authorization01 = require('./authorization-01');
const adminQuestion01 = require('./admin-question-01');
const adminQuestion02 = require('./admin-question-02');
const adminQuestion03 = require('./admin-question-03');
const adminQuestion04 = require('./admin-question-04');
const adminSurvey01 = require('./admin-survey-01');
const adminProfileSurvey01 = require('./admin-profile-survey-01');
const adminConsentDocument01 = require('./admin-consent-document-01');
const adminConsentDocument02 = require('./admin-consent-document-02');
const adminConsentDocument03 = require('./admin-consent-document-03');
const adminConsentDocument04 = require('./admin-consent-document-04');
const registration01 = require('./registration-01');
const registration02 = require('./registration-02');
const registration03 = require('./registration-03');
const registration04 = require('./registration-04');
const profile01 = require('./profile-01');
const profile02 = require('./profile-02');
const surveys01 = require('./surveys-01');
const surveys02 = require('./surveys-02');
const surveys03 = require('./surveys-03');
const surveys04 = require('./surveys-04');
const surveys05 = require('./surveys-05');
const consentDocuments01 = require('./consent-documents-01');
const consentDocuments02 = require('./consent-documents-02');
const consentDocuments03 = require('./consent-documents-03');
const consentDocuments04 = require('./consent-documents-04');
const consentDocuments05 = require('./consent-documents-05');
const consentDocuments06 = require('./consent-documents-06');
const consentDocuments07 = require('./consent-documents-07');
const smtp01 = require('./smtp-01');
const smtp02 = require('./smtp-02');
const languages01 = require('./languages-01');
const languages02 = require('./languages-02');
const languages03 = require('./languages-03');
const languages04 = require('./languages-04');
const languages05 = require('./languages-05');
const translationsQuestions01 = require('./translations-questions-01');
const translationsQuestions02 = require('./translations-questions-02');
const translationsSurveys01 = require('./translations-surveys-01');
const translationsSurveys02 = require('./translations-surveys-02');
const translationsConsentTypes01 = require('./translations-consent-types-01');
const translationsConsentTypes02 = require('./translations-consent-types-02');
const translationsConsentDocuments01 = require('./translations-consent-documents-01');
const translationsConsentDocuments02 = require('./translations-consent-documents-02');

const locals = {};

models.sequelize.sync({ force: true })
    .then(() => locals)
    .then(authentication01)
    .then(authorization01)
    .then(adminQuestion01)
    .then(adminQuestion02)
    .then(adminQuestion03)
    .then(adminQuestion04)
    .then(adminSurvey01)
    .then(adminProfileSurvey01)
    .then(adminConsentDocument01)
    .then(adminConsentDocument02)
    .then(adminConsentDocument03)
    .then(adminConsentDocument04)
    .then(registration01)
    .then(registration02)
    .then(registration03)
    .then(registration04)
    .then(profile01)
    .then(profile02)
    .then(profile01)
    .then(surveys01)
    .then(surveys02)
    .then(surveys03)
    .then(surveys04)
    .then(surveys05)
    .then(consentDocuments01)
    .then(consentDocuments02)
    .then(consentDocuments03)
    .then(consentDocuments04)
    .then(consentDocuments05)
    .then(consentDocuments06)
    .then(consentDocuments01)
    .then(consentDocuments07)
    .then(smtp01)
    .then(smtp02)
    .then(languages01)
    .then(languages02)
    .then(languages03)
    .then(languages04)
    .then(languages05)
    .then(languages01)
    .then(translationsQuestions01)
    .then(translationsQuestions02)
    .then(translationsSurveys01)
    .then(translationsSurveys02)
    .then(translationsConsentTypes01)
    .then(translationsConsentTypes02)
    .then(translationsConsentDocuments01)
    .then(translationsConsentDocuments02)
    .then(() => {
        console.log('success');
        process.exit(0);
    })
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });
