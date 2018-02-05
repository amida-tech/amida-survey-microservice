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
const sectionCommon = require('../util/section-common');
const surveyCommon = require('../util/survey-common');
const assessmentCommon = require('../util/assessment-common');
// const ExportCSVConverter = require('../../import/csv-converter.js');
const ExportBuilder = require('./assessment-answer.export-builder');
const answerSession = require('../fixtures/answer-session/assessment-0');
const answerSessionSections = require('../fixtures/answer-session/assessment-1');
const expect = chai.expect;

describe('export assessment answers unit', function answerAssessmentUnit() {
    // TODO: verify import scripts work for assessment-answers
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



    before(shared.setUpFn());

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
            const override = { name, stage, group: String(nameIndex) };
            it(`create assessment ${name} ${stage}`, assessmentTests.createAssessmentFn([0], override));
        });
    });
    it('print hxSurvey after creation of survey 0', () => {
        console.log("hxSurvey")
        console.log(hxSurvey.servers)
        console.log("hxQuestion")
        console.log(hxQuestion.servers)
        return function blah(){

        }

    })

    let assessmentIndexSet = new Set();
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

    const verifyExportAssessmentAnswers = function verifyExportAssessmentAnswers({questionId, sectionId}) {
        // TODO add section ids to tests
        return function verify() {
            const options = { questionId, sectionId, surveyId: 1 };
            return models.assessmentAnswer.exportAssessmentAnswers(options)
                .then((answers) => {
                    const expected = exportBuilder.getExpectedExportedAsessmentAnswers(options);
                    expect(_.sortBy(answers, answr => answr.assessmentId)).to.deep.equal(_.sortBy(expected, expctd => expctd.assessmentId));
                });
        };
    };

    _.range(1, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers({questionId:index}));
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
    _.range(questionCount, questionSectionCount).forEach((index) => {
        it(`create question ${index}`, questionTests.createQuestionFn());
        it(`get question ${index}`, questionTests.getQuestionFn(index));
    });


//    it(`create survey 2 with sections`, surveyTests.createSurveyFn({noneRequired: true, noSection: false}));
    const surveyOpts2 = {noneRequired: true, noSection: false};
    it('create survey 2 with sections', surveyTests.createSurveyQxHxFn(_.range(questionCount, questionSectionCount), surveyOpts2));

    it('print hxSurvey after creation of survey 2', () => {
        console.log("hxSurvey")
        console.log(hxSurvey.clients[1])
        console.log(hxSurvey)
        console.log("hxQuestion")
        console.log(hxQuestion.servers)
        return function blah(){

        }

    })
    _.range(nameCount).forEach((nameIndex) => {
        _.range(stageCount).forEach((stage) => {
            const name = `name_${nameIndex + 3}`;
            const override = { name, stage, group: String(nameIndex) };
            it(`create assessment ${name} ${stage}`, assessmentTests.createAssessmentFn([1], override));
        });
    });

    assessmentIndexSet = new Set();
    answerSessionSections.forEach((answersSpec) => {
        const { name, stage, user, questions, commentQuestions } = answersSpec;
        const userIndex = user;
        const questionIndices = questions;
        const commentIndices = commentQuestions;
        const assessmentIndex = (((name - 3) * stageCount) + stage) + 12 ;
        assessmentIndexSet.add(assessmentIndex);
        it(`user ${userIndex} creates assessesment ${name} ${stage}`,
                tests.createAssessmentAnswersFn(userIndex, 1, questionIndices, assessmentIndex, commentIndices));
    });

    _.range(11, 18).forEach((index) => {
        it(`exported assessment-answers, surveyId: 1, sectionId: ${index}`,
            verifyExportAssessmentAnswers({sectionId:index}));
    });

    it('verifyErrorMsgBothQuestionIdSectionId', verifyErrorMsgBothQuestionIdSectionId);
    it('verifyErrorMsgNoSurveyId', verifyErrorMsgNoSurveyId);
});
