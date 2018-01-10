/* global describe,before,it */

'use strict';

process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const models = require('../models');

const SharedSpec = require('./util/shared-spec.js');
const Generator = require('./util/generator');
const History = require('./util/history');
const SurveyHistory = require('./util/survey-history');
const questionCommon = require('./util/question-common');
const surveyCommon = require('./util/survey-common');
const answerCommon = require('./util/answer-common');

const expect = chai.expect;
const generator = new Generator();
const shared = new SharedSpec(generator);

describe('scale type question unit', function scaleQuestionUnit() {
    before(shared.setUpFn());

    const hxQuestion = new History();
    const hxSurvey = new SurveyHistory();
    const hxUser = new History();

    const tests = new questionCommon.SpecTests({ generator, hxQuestion });
    const surveyTests = new surveyCommon.SpecTests(generator, hxSurvey, hxQuestion);
    const answerTests = new answerCommon.SpecTests({ generator, hxUser, hxSurvey, hxQuestion });

    const cases = [
        [null, 5],    // 0
        [5, null],    // 1
        [7, 81],      // 2
        [0.5, 1.45],  // 3
        [1.4, null],  // 4
        [null, 5.15], // 5
        [0, 5],       // 6
        [-5, 0],      // 7
        [0, null],    // 8
        [null, 0],    // 9
    ];

    cases.forEach(([min, max], index) => {
        const scaleLimits = {};
        if (min === 0 || min) {
            scaleLimits.min = min;
        }
        if (max === 0 || max) {
            scaleLimits.max = max;
        }
        const options = { type: 'scale', scaleLimits };
        it(`create question ${index}`, tests.createQuestionFn(options));
        it(`get question ${index}`, tests.getQuestionFn(index));
        it(`verify question ${index}`, tests.verifyQuestionFn(index));
    });

    it('list questions 2, 4, 7', function listIded() {
        const indices = [2, 4, 5];
        const ids = indices.map(i => hxQuestion.id(i));
        return models.question.listQuestions({ scope: 'complete', ids })
            .then((questions) => {
                const expected = hxQuestion.listServers(null, indices);
                expect(questions).to.deep.equal(expected);
            });
    });

    it('list all questions (complete)', tests.listQuestionsFn('complete'));

    it('list all questions (summary)', tests.listQuestionsFn('summary'));

    it('list all questions (default - summary)', tests.listQuestionsFn());

    it('create all scale survey',
        surveyTests.createSurveyQxHxFn(_.range(cases.length)));
    it('get all scale survey', surveyTests.getSurveyFn(0));

    const userCount = 2;
    _.range(userCount + 1).forEach((i) => {
        it(`create user ${i}`, shared.createUserFn(hxUser));
    });

    it('user 0 answers survey 0', answerTests.answerSurveyFn(0, 0, _.range(cases.length)));
    it('user 0 gets answers to survey 0', answerTests.getAnswersFn(0, 0));

    const errorCases = [
        { qxIndex: 0, numberValue: 6 },
        { qxIndex: 1, numberValue: 4 },
        { qxIndex: 2, numberValue: 6 },
        { qxIndex: 2, numberValue: 100.0 },
        { qxIndex: 3, numberValue: 0 },
        { qxIndex: 3, numberValue: 4 },
        { qxIndex: 4, numberValue: 1.3 },
        { qxIndex: 5, numberValue: 6.5 },
        { qxIndex: 6, numberValue: -1 },
        { qxIndex: 6, numberValue: 10 },
        { qxIndex: 7, numberValue: -10.1 },
        { qxIndex: 7, numberValue: 1 },
        { qxIndex: 8, numberValue: -1 },
        { qxIndex: 9, numberValue: 5 },
    ];

    errorCases.forEach(({ qxIndex, numberValue }, index) => {
        it(`error: answer out of scale case ${index}`, function errorOutOfLimits() {
            const answers = [{
                questionId: hxQuestion.id(qxIndex),
                answer: { numberValue },
            }];
            const userId = hxUser.id(1);
            const surveyId = hxSurvey.id(0);
            const status = 'in-progress';
            return models.userSurvey.createUserSurveyAnswers(userId, surveyId, { status, answers })
                .then(shared.throwingHandler, shared.expectedErrorHandler('answerOutOfScale', numberValue));
        });
    });
});
