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
const CSVConverterExport = require('../../export/csv-converter');

const expect = chai.expect;

describe('export assessment answers integration', function answerAssessmentImportExportIntegration() {
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
            const override = { name, stage, group: `${nameIndex}` };
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
            tests.createAssessmentAnswersFn(userIndex, 0, questionIndices, assessmentIndex, commentIndices, 'en'));
        it(`user ${userIndex} gets answers  assessesment ${name} ${stage}`,
            tests.getAssessmentAnswersFn(userIndex, 0, assessmentIndex));

        it(`logout as user ${userIndex}`, shared.logoutFn());
    });


    it('login as super', shared.loginFn(config.superUser));

    const verifyExportAssessmentAnswers = function (index) {
        // TODO add section ids to tests
        const options = { 'survey-id': 1 };
        if (index || index === 0) {
            options['question-id'] = index;
        }
        return function verify() {
            return surveySuperTest.get('/assessment-answers/export', true, 200, options)
                .then((res) => {
                    const answers = res.body;
                    const controllerOptions = Object.assign({}, { questionId: options['question-id'], surveyId: options['survey-id'] });
                    const expected = exportBuilder.getExpectedExportedAsessmentAnswers(controllerOptions);
                    expected.forEach((e, indx) => {
                        // cheat questionIndex out of the comparison because we don't have access to them
                        // in the expected values
                        expect(answers[indx]).to.deep.equal(Object.assign({}, e, { questionIndex: answers[indx].questionIndex }));
                        expect(answers[indx].questionIndex).to.be.a('number');
                    });
                });
        };
    };

    const escapeRegExp = function (string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const verifyExportAssessmentAnswersCSV = function (index, includeComments) {
        // TODO add section ids to tests
        const options = { 'survey-id': 1 };
        if (index || index === 0) {
            options['question-id'] = index;
        }
        if (includeComments) {
            options['include-comments'] = true;
        }
        return function verify() {
            return surveySuperTest.get('/assessment-answers/csv', true, 200, options)
                .then((res) => {
                    const controllerOptions = Object.assign({}, {
                        questionId: options['question-id'],
                        surveyId: options['survey-id'],
                        includeComments,
                    });
                    const csvConverter = new CSVConverterExport();
                    let expected = exportBuilder.getExpectedExportedAsessmentAnswers(controllerOptions);
                    expected = expected.length ? csvConverter.dataToCSV(expected) : '';
                    // match against any integer value for questionIndex because we don't have access to them
                    // in the expected values
                    const expectedRegExpString = escapeRegExp(expected).replace(/"QUESTION_INDEX_CONSTANT"/g, '\\d+');
                    expect(res.text).to.match(new RegExp(expectedRegExpString));
                });
        };
    };

    _.range(0, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers JSON, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers(index, false));
    });

    _.range(0, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers JSON with comments, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers(index, true));
    });

    _.range(0, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers CSV, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswersCSV(index));
    });

    it('export assessment answers no questionId JSON', verifyExportAssessmentAnswers());
    it('export assessment answers no questionId CSV', verifyExportAssessmentAnswers());

    it('logout as super', shared.logoutFn());
});
