'use strict';

/* eslint func-names: 0, no-console: 0, no-param-reassign: 0, max-len: 0 */

const models = require('../../models');

const authentication01 = require('./authentication-01');
const authentication03 = require('./authentication-03');
const adminQuestion01 = require('./admin-question-01');
const adminQuestion02 = require('./admin-question-02');
const adminQuestion03 = require('./admin-question-03');
const adminQuestion04 = require('./admin-question-04');
const adminSurvey01 = require('./admin-survey-01');
const questions01 = require('./questions-01');
const questions02 = require('./questions-02');
const surveys01 = require('./surveys-01');
const surveys02 = require('./surveys-02');
const surveys03 = require('./surveys-03');
const surveys04 = require('./surveys-04');
const surveys05 = require('./surveys-05');
const languages01 = require('./languages-01');
const languages02 = require('./languages-02');
const languages03 = require('./languages-03');
const languages04 = require('./languages-04');
const languages05 = require('./languages-05');
const translationsQuestions01 = require('./translations-questions-01');
const translationsQuestions02 = require('./translations-questions-02');
const translationsSurveys01 = require('./translations-surveys-01');
const translationsSurveys02 = require('./translations-surveys-02');
const userSurvey01 = require('./user-survey-01');
const userSurvey02 = require('./user-survey-02');
const userSurvey03 = require('./user-survey-03');
const userSurvey04 = require('./user-survey-04');
const userSurvey05 = require('./user-survey-05');

const locals = {};

models.sequelize.sync({ force: true })
    .then(() => locals)
    .then(authentication01)
    .then(adminQuestion01)
    .then(adminQuestion02)
    .then(adminQuestion03)
    .then(adminQuestion04)
    .then(adminSurvey01)
    .then(authentication01)
    .then(questions01)
    .then(questions02)
    .then(surveys01)
    .then(surveys02)
    .then(surveys03)
    .then(surveys04)
    .then(surveys05)
    .then(authentication03)
    .then(userSurvey01)
    .then(userSurvey02)
    .then(userSurvey03)
    .then(userSurvey01)
    .then(userSurvey04)
    .then(userSurvey05)
    .then(authentication01)
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
    .then(() => {
        console.log('success');
        process.exit(0);
    })
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });
