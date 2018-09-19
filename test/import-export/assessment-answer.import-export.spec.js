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
const answerSessionSections = require('../fixtures/answer-session/assessment-1');

const expect = chai.expect;

describe('export assessment answers unit', function answerAssessmentImportExportUnit() {
    const generator = new Generator();
    const shared = new SharedSpec(generator);
    const hxUser = new History();
    const hxSurvey = new SurveyHistory();
    const hxQuestion = new History();
    const hxSection = new History();
    const hxAssessment = new History(['id', 'name', 'stage', 'group']);
    const hxAnswer = new History();


    const questionTests = new questionCommon.SpecTests({ generator, hxQuestion });
    const surveyTests = new surveyCommon.SpecTests(generator, hxSurvey, hxQuestion, hxSection);
    const assessmentTests = new assessmentCommon.SpecTests(generator, hxSurvey, hxAssessment);
    const tests = new assessmentAnswerCommon.SpecTests({
        generator, hxUser, hxSurvey, hxQuestion, hxAssessment, hxAnswer,
    });
    const exportBuilder = new ExportBuilder.AssessmentAnswerExportBuilder({ hxSurvey, hxQuestion, hxAssessment, tests });

    const userCount = assessmentAnswerCommon.findMax(answerSession, 'user');
    const questionCount = assessmentAnswerCommon.findQuestionCount(answerSession);
    const questionSectionCount = assessmentAnswerCommon.findQuestionCount(answerSessionSections);
    const nameCount = assessmentAnswerCommon.findMax(answerSession, 'name');
    const stageCount = assessmentAnswerCommon.findMax(answerSession, 'stage');
    const sectionCount = 3;


    before(shared.setUpFn());
    it('reset database', shared.setUpFn());

    it('sanity checks', function sanityChecks() {
        expect(userCount).to.be.above(0);
        expect(questionCount).to.be.above(0);
        expect(questionSectionCount).to.be.above(0);
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

    let assessmentIndexSet = new Set();
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

    const verifyExportAssessmentAnswers = function (options = {}) {
        return function verify() {
            return models.assessmentAnswer.exportAssessmentAnswers(options)
                .then((answers) => {
                    const expected = exportBuilder.getExpectedExportedAsessmentAnswers(options);

                    answers.forEach((a, indx) => {
                        expect(a).to.deep.equal(Object.assign({}, expected[indx], { questionIndex: answers[indx].questionIndex }));
                        expect(a.questionIndex).to.be.a('number');
                    });
                });
        };
    };


    _.range(0, questionCount + 1).forEach((questionId) => {
        it(`exported assessment-answers, surveyId: 1, questionId: ${questionId}`,
            verifyExportAssessmentAnswers({ questionId, includeComments: false, surveyId: 1 }));
    });

    _.range(0, questionCount + 1).forEach((questionId) => {
        it(`exported assessment-answers with comments, surveyId: 1, questionId: ${questionId}`,
            verifyExportAssessmentAnswers({ questionId, includeComments: true, surveyId: 1 }));
    });

    it('export assessment answers no questionId or sectionId', verifyExportAssessmentAnswers({ includeComments: false, surveyId: 1 }));

    it('export assessment answers no questionId or sectionId with comments', verifyExportAssessmentAnswers({ includeComments: true, surveyId: 1 }));

    _.range(questionCount, questionSectionCount).forEach((index) => {
        it(`create question ${index}`, questionTests.createQuestionFn());
        it(`get question ${index}`, questionTests.getQuestionFn(index));
    });


    const surveyOpts2 = { noneRequired: true, noSection: false };
    it('create survey 2 with sections', surveyTests.createSurveyQxHxFn(_.range(questionCount, questionSectionCount), surveyOpts2));

    _.range(nameCount).forEach((nameIndex) => {
        _.range(stageCount).forEach((stage) => {
            const name = `name_${nameIndex + 3}`;
            const override = { name, stage, group: String(nameIndex + 3) };
            it(`create assessment ${name} ${stage}`, assessmentTests.createAssessmentFn([1], override));
        });
    });

    assessmentIndexSet = new Set();
    answerSessionSections.forEach((answersSpec) => {
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
                    tests.copyAssessmentAnswersFn(userIndex, 1, assessmentIndex, prevAssessmentIndex));
            }
        }

        it(`user ${userIndex} creates assessesment ${name} ${stage}`,
                tests.createAssessmentAnswersFn(userIndex, 1, questionIndices, assessmentIndex, commentIndices));
    });

    _.range(sectionCount).forEach((index) => {
        it(`exported assessment-answers, surveyId: 2, sectionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ sectionId: index + 1, surveyId: 2, includeComments: false }));
    });

    _.range(sectionCount).forEach((index) => {
        it(`exported assessment-answers CSV, surveyId: 2, sectionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ sectionId: index + 1, surveyId: 2, includeComments: true }));
    });
});
