/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const models = require('../../models');
const SharedSpec = require('../util/shared-spec');
const Generator = require('../util/generator');
const History = require('../util/history');
const SurveyHistory = require('../util/survey-history');
const assessmentAnswerCommon = require('../util/assessment-answer-common');
const questionCommon = require('../util/question-common');
const surveyCommon = require('../util/survey-common');
const assessmentCommon = require('../util/assessment-common');
// const ExportCSVConverter = require('../../import/csv-converter.js');
const ExportBuilder = require('./assessment-answer.export-builder');
const answerSession = require('../fixtures/answer-session/assessment-0');

const expect = chai.expect;

describe('export assessment answers unit', function answerAssessmentUnit() {
    // TODO: verify import scripts work for assessment-answers
    const generator = new Generator();
    const shared = new SharedSpec(generator);
    const hxUser = new History();
    const hxSurvey = new SurveyHistory();
    const hxQuestion = new History();
    const hxAssessment = new History(['id', 'name', 'stage', 'group']);
    const hxAnswer = new History();

    const questionTests = new questionCommon.SpecTests({ generator, hxQuestion });
    const surveyTests = new surveyCommon.SpecTests(generator, hxSurvey, hxQuestion);
    const assessmentTests = new assessmentCommon.SpecTests(generator, hxSurvey, hxAssessment);
    const tests = new assessmentAnswerCommon.SpecTests({
        generator, hxUser, hxSurvey, hxQuestion, hxAssessment, hxAnswer,
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


    const assessmentIndexSet = new Set();
    answerSession.forEach((answersSpec) => {
        const { name, stage, user, questions, commentQuestions } = answersSpec;
        const userIndex = user;
        const questionIndices = questions;
        const commentIndices = commentQuestions;
        const assessmentIndex = (name * stageCount) + stage;
        assessmentIndexSet.add(assessmentIndex);
        it(`user ${userIndex} creates assessesment ${name} ${stage}`,
                tests.createAssessmentAnswersFn(userIndex, 0, questionIndices, assessmentIndex, commentIndices));
    });

    const verifyExportAssessmentAnswers = function verifyExportAssessmentAnswers(index) {
        // TODO add section ids to tests
        return function verify() {
            const options = { questionId: index, surveyId: 1 };
            return models.assessmentAnswer.exportAssessmentAnswers(options)
                .then((answers) => {
                    const expected = exportBuilder.getExpectedExportedAsessmentAnswers(options);
                    expect(_.sortBy(answers, answr => answr.assessmentId)).to.deep.equal(_.sortBy(expected, expctd => expctd.assessmentId));
                });
        };
    };

    _.range(1, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers(index));
    });

    const verifyErrorMsgBothQuestionIdSectionId = function verifyErrorMsg() {
        return function verifyErr() {
            const options = { questionId: 1, surveyId: 1, sectionId: 1 };
            return models.assessmentAnswer.exportAssessmentAnswers(options)
            .then(res => shared.verifyErrorMessage(res, 'surveyBothQuestionsSectionsSpecified'));
        };
    };

    const verifyErrorMsgNoSurveyId = function verifyErrorMsg() {
        return function verifyErr() {
            const options = { questionId: 1, sectionId: 1 };
            return models.assessmentAnswer.exportAssessmentAnswers(options)
            .then(res => shared.verifyErrorMessage(res, 'surveyMustBeSpecified'));
        };
    };

    it('verifyErrorMsgBothQuestionIdSectionId', verifyErrorMsgBothQuestionIdSectionId);
    it('verifyErrorMsgNoSurveyId', verifyErrorMsgNoSurveyId);
});
