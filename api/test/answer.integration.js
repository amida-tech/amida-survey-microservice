/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const config = require('../config');

const SharedIntegration = require('./util/shared-integration');
const RRSuperTest = require('./util/rr-super-test');
const Generator = require('./util/generator');
const AnswerHistory = require('./util/answer-history');
const answerCommon = require('./util/answer-common');
const questionCommon = require('./util/question-common');

const expect = chai.expect;

describe('answer integration', function () {
    const generator = new Generator();
    const shared = new SharedIntegration(generator);

    const store = new RRSuperTest();

    const testQuestions = answerCommon.testQuestions;
    const hxAnswer = new AnswerHistory();

    const hxUser = hxAnswer.hxUser;
    const hxQuestion = hxAnswer.hxQuestion;
    const hxSurvey = hxAnswer.hxSurvey;
    const questionTests = new questionCommon.IntegrationTests(store, generator, hxQuestion);

    before(shared.setUpFn(store));

    it('login as super', shared.loginFn(store, config.superUser));

    for (let i = 0; i < 4; ++i) {
        it(`create user ${i}`, shared.createUserFn(store, hxUser));
    }

    for (let i = 0; i < 20; ++i) {
        it(`create question ${i}`, questionTests.createQuestionFn());
        it(`fill choices ids in question ${i}`, shared.fillQxFn(store, hxQuestion));
    }

    _.map(testQuestions, 'survey').forEach((surveyQuestion, index) => {
        return it(`create survey ${index}`, shared.createSurveyFn(store, hxSurvey, hxQuestion, surveyQuestion));
    });

    it('logout as super', shared.logoutFn(store));

    const cases = [
        { userIndex: 0, surveyIndex: 0, seqIndex: 0 },
        { userIndex: 1, surveyIndex: 1, seqIndex: 0 },
        { userIndex: 2, surveyIndex: 2, seqIndex: 0 },
        { userIndex: 3, surveyIndex: 3, seqIndex: 0 },
        { userIndex: 2, surveyIndex: 4, seqIndex: 0 },
        { userIndex: 0, surveyIndex: 3, seqIndex: 1 },
    ];

    const postAnswersFn = function (userIndex, surveyIndex, seqIndex, stepIndex) {
        return function (done) {
            const qxIndices = testQuestions[surveyIndex].answerSequences[seqIndex][stepIndex];
            const { answers, language } = hxAnswer.generateAnswers(userIndex, surveyIndex, qxIndices);
            const input = {
                surveyId: hxSurvey.id(surveyIndex),
                answers
            };
            if (language) {
                input.language = language;
            }
            store.post('/answers', input, 204).end(done);
        };
    };

    const getAndVerifyFn = function (userIndex, surveyIndex, seqIndex) {
        return function (done) {
            const surveyId = hxSurvey.id(surveyIndex);
            store.get('/answers', true, 200, { 'survey-id': surveyId })
                .expect(function (res) {
                    const expected = hxAnswer.expectedAnswers(userIndex, surveyIndex, seqIndex);
                    const actual = _.sortBy(res.body, 'questionId');
                    expect(actual).to.deep.equal(expected);
                })
                .end(done);
        };
    };

    for (let j = 0; j < 3; ++j) {
        for (let i = 0; i < cases.length; ++i) {
            const { userIndex, surveyIndex, seqIndex } = cases[i];
            it(`login as user ${userIndex}`, shared.loginIndexFn(store, hxUser, userIndex));

            const msgPost = `answers survey ${surveyIndex}-${seqIndex} step ${j}`;
            it(msgPost, postAnswersFn(userIndex, surveyIndex, seqIndex, j));

            const msgGet = `get and verify answers to survey ${surveyIndex}-${seqIndex} step ${j}`;
            it(msgGet, getAndVerifyFn(userIndex, surveyIndex, seqIndex, j));

            it(`logout as  user ${userIndex}`, shared.logoutFn(store));
        }
    }
});
