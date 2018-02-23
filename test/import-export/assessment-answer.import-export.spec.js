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
const ExportBuilder = require('./assessment-answer.export-builder');
const answerSession = require('../fixtures/answer-session/assessment-2');

const expect = chai.expect;

describe('export assessment answers unit', function answerAssessmentImportExportUnit() {
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
    it('reset database', shared.setUpFn());

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
            const override = { name, stage, group: `${nameIndex}` };
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
    });

    const verifyExportAssessmentAnswers = function ({ index, includeComments }) {
        // TODO add section ids to tests
        const options = { surveyId: 1, includeComments };
        if (index || index === 0) {
            options.questionId = index;
        }
        return function verify() {
            return models.assessmentAnswer.exportAssessmentAnswers(options)
                .then((answers) => {
                    const expected = exportBuilder.getExpectedExportedAsessmentAnswers(options);
                    expected.forEach((e, indx) => {
                        expect(answers[indx]).to.deep.equal(e);
                    });
                });
        };
    };

    _.range(0, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers, surveyId: 1, questionId: ${index}`,
            verifyExportAssessmentAnswers({ index, includeComments: false }));
    });

    _.range(0, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers with comments, surveyId: 1, questionId: ${index}`,
            verifyExportAssessmentAnswers({ index, includeComments: true }));
    });

    it('export assessment answers no questionId', verifyExportAssessmentAnswers({ includeComments: false }));

    it('export assessment answers no questionId with comments', verifyExportAssessmentAnswers({ includeComments: true }));
    // const verifyErrorMsgBothQuestionIdSectionId = function () {
    //     return function verify() {
    //         const options = { questionId: 1, surveyId: 1, sectionId: 1 };
    //         return models.assessmentAnswer.exportAssessmentAnswers(options)
    //         .then(res => shared.verifyErrorMessage(res, 'surveyBothQuestionsSectionsSpecified'));
    //     };
    // };

    const verifyErrorMsgNoSurveyId = function () {
        return function verify() {
            const options = { questionId: 1, sectionId: 1 };
            return models.assessmentAnswer.exportAssessmentAnswers(options)
            .then(res => shared.verifyErrorMessage(res, 'surveyMustBeSpecified'));
        };
    };

    // to be uncommented for SER-30 it('verifyErrorMsgBothQuestionIdSectionId', verifyErrorMsgBothQuestionIdSectionId);
    it('verifyErrorMsgNoSurveyId', verifyErrorMsgNoSurveyId);
});
