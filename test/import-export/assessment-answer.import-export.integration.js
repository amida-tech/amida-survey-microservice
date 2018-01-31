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
const answerSession = require('../fixtures/answer-session/assessment-2');
const ExportBuilder = require('./assessment-answer.export-builder');

const expect = chai.expect;

describe('export assessment answers integration', function answerAssessmentUnit() {
    const generator = new Generator();
    const surveySuperTest = new SurveySuperTest();
    const shared = new SharedIntegration(surveySuperTest, generator);
    const hxUser = new History();
    const hxSurvey = new SurveyHistory();
    const hxQuestion = new History();
    const hxAssessment = new History(['id', 'name', 'stage', 'group']);

    const questionTests = new questionCommon.IntegrationTests(surveySuperTest, { generator, hxQuestion });
    const surveyTests = new surveyCommon.IntegrationTests(surveySuperTest, generator, hxSurvey, hxQuestion);
    const assessmentTests = new assessmentCommon.IntegrationTests(surveySuperTest, generator, hxSurvey, hxAssessment);
    const tests = new assessmentAnswerCommon.IntegrationTests(surveySuperTest, {
        generator, hxUser, hxSurvey, hxQuestion, hxAssessment,
    });
    const exportBuilder = new ExportBuilder.AssessmentAnswerExportBuilder({ hxSurvey, hxQuestion, hxAssessment, tests });
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
            const override = { name, stage, group: String(nameIndex) };
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
        it(`login as user ${userIndex}`, shared.loginIndexFn(hxUser, userIndex));

        if (!assessmentIndexSet.has(assessmentIndex)) {
            assessmentIndexSet.add(assessmentIndex);
            if (stage > 0) {
                const prevAssessmentIndex = (name * stageCount) + (stage - 1);
                it(`user ${userIndex} copies assessesment ${name} ${stage}`,
                    tests.copyAssessmentAnswersFn(userIndex, 0, assessmentIndex, prevAssessmentIndex));
            }
        }

        it(`user ${userIndex} creates assessesment ${name} ${stage}`,
            tests.createAssessmentAnswersFn(userIndex, 0, questionIndices, assessmentIndex, commentIndices));
        it(`user ${userIndex} gets answers  assessesment ${name} ${stage}`,
            tests.getAssessmentAnswersFn(userIndex, 0, assessmentIndex));

        it(`logout as user ${userIndex}`, shared.logoutFn());
    });


    it('login as super', shared.loginFn(config.superUser));

    const verifyExportAssessmentAnswers = function verifyExportAssessmentAnswers(index) {
        // TODO add section ids to tests
        return function verify() {
            const options = { question_id: index, survey_id: 1 };
            return surveySuperTest.get('/assessment-answers/export', true, 200, options)
                .then((answers) => {
                    const expected = exportBuilder.getExpectedExportedAsessmentAnswers(Object.assign({}, { questionId: options.question_id, surveyId: options.survey_id }));
                    expect(_.sortBy(answers.body, answr => answr.assessmentId)).to.deep.equal(_.sortBy(expected, expctd => expctd.assessmentId));
                });
        };
    };

    _.range(0, questionCount + 2).forEach((index) => {
        it(`exported assessment-answers, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers(index));
    });

    it('logout as super', shared.logoutFn());
});
