/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const config = require('../../config');
const SharedIntegration = require('../util/shared-integration');
const Generator = require('../util/generator');
const History = require('../util/history');
const SurveyHistory = require('../util/survey-history');
const assessmentAnswerCommon = require('../util/assessment-answer-common');
const questionCommon = require('../util/question-common');
const surveyCommon = require('../util/survey-common');
const assessmentCommon = require('../util/assessment-common');
const SurveySuperTest = require('../util/survey-super-test');
const answerSession = require('../fixtures/answer-session/assessment-0');
const ExportBuilder = require('./assessment-answer.export-builder');

const expect = chai.expect;

describe('export assessment answers integration', function answerAssessmentUnit() {
    // TODO: verify import scripts work for assessment-answers
    const surveySuperTest = new SurveySuperTest();
    const generator = new Generator();

    const shared = new SharedIntegration(surveySuperTest, generator);
    const hxUser = new History();
    const hxSurvey = new SurveyHistory();
    const hxQuestion = new History();
    const hxAssessment = new History();
    const hxAnswer = new History();

    const questionTests = new questionCommon.IntegrationTests(surveySuperTest, { generator, hxQuestion });
    const surveyTests = new surveyCommon.IntegrationTests(surveySuperTest, generator, hxSurvey, hxQuestion);
    const assessmentTests = new assessmentCommon.IntegrationTests(surveySuperTest, generator, hxSurvey, hxAssessment);
    const tests = new assessmentAnswerCommon.IntegrationTests(surveySuperTest, {
        generator, hxUser, hxSurvey, hxQuestion, hxAssessment, hxAnswer,
    });
    const exportBuilder = new ExportBuilder.AssessmentAnswerExportBuilder({ hxSurvey, hxQuestion, hxAnswer, tests });

    const userCount = assessmentAnswerCommon.findMax(answerSession, 'user');
    const questionCount = assessmentAnswerCommon.findQuestionCount(answerSession);
    const nameCount = assessmentAnswerCommon.findMax(answerSession, 'name');
    const stageCount = assessmentAnswerCommon.findMax(answerSession, 'stage');

    before(shared.setUpFn());

    it('sanity checks', function sanityChecks() {
        expect(userCount).to.be.above(0);
        expect(questionCount).to.be.above(0);
        expect(nameCount).to.be.above(0);
        expect(stageCount).to.be.above(0);
    });

    it('login as super', shared.loginFn(config.superUser));

    _.range(userCount).forEach((index) => {
        it(`create user ${index}`, shared.createUserFn(hxUser));
    });

    _.range(questionCount).forEach((index) => {
        it(`create question ${index}`, questionTests.createQuestionFn());
        it(`get question ${index}`, questionTests.getQuestionFn(index));
    });

    const surveyOpts = { noneRequired: true };
    it('create survey 0', surveyTests.createSurveyQxHxFn(_.range(questionCount), surveyOpts));

    _.range(nameCount).forEach((nameIndex) => {
        _.range(stageCount).forEach((stage) => {
            const name = `name_${nameIndex}`;
            const override = { name, stage };
            it(`create assessment ${name} ${stage}`, assessmentTests.createAssessmentFn([0], override));
        });
    });
    it('logout as super', shared.logoutFn());
    const assessmentIndexSet = new Set();
    answerSession.forEach((answersSpec) => {
        const { name, stage, user, questions, commentQuestions } = answersSpec;
        const userIndex = user;
        const questionIndices = questions;
        const commentIndices = commentQuestions;
        const assessmentIndex = (name * stageCount) + stage;
        assessmentIndexSet.add(assessmentIndex);
        it(`login as user ${userIndex}`, shared.loginIndexFn(hxUser, userIndex));
        it(`user ${userIndex} creates assessesment ${name} ${stage}`,
                tests.createAssessmentAnswersFn(userIndex, 0, questionIndices, assessmentIndex, commentIndices));
        it(`logout as  user ${userIndex}`, shared.logoutFn());
    });
    it('login as super', shared.loginFn(config.superUser));


    const verifyExportAssessmentAnswers = function verifyExportAssessmentAnswers(index) {
        // TODO add section ids to tests
        return function verify() {
            const options = { 'question-id': index, 'survey-id': 1 };
            return surveySuperTest.get('/assessment-answers/export', true, 200, options)
                .then((answers) => {
                    const expected = exportBuilder.getExpectedExportedAsessmentAnswers(Object.assign({}, { questionId: options['question-id'], surveyId: options['survey-id'] }));
                    expect(_.sortBy(answers.body, answr => answr.assessmentId)).to.deep.equal(_.sortBy(expected, expctd => expctd.assessmentId));
                });
        };
    };
    _.range(1, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers csv, surveyId: 1, questionId: ${index}`,
            verifyExportAssessmentAnswers(index));
    });
    it('logout as super', shared.logoutFn());
});
