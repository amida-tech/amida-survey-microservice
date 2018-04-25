/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

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
const answerSessionSections = require('../fixtures/answer-session/assessment-1');
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
    const questionSectionCount = assessmentAnswerCommon.findQuestionCount(answerSessionSections);
    const sectionCount = 3;
    const nameCount = assessmentAnswerCommon.findMax(answerSession, 'name');
    const stageCount = assessmentAnswerCommon.findMax(answerSession, 'stage');
    const generatedDirectory = path.join(__dirname, '../generated');
    const userIdMap = {};
    _.range(0, 13).forEach((x) => {
        userIdMap[String(x)] = x;
    });


    before(shared.setUpFn());

    it('create output directory if necessary', (done) => {
        mkdirp(generatedDirectory, done);
    });

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


    let assessmentIndexSet = new Set();
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

    const escapeRegExp = function (string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const verifyExportAssessmentAnswers = function (options, format) {
        return function verify() {
            let call;
            if (format === 'JSON') {
                call = surveySuperTest.get('/assessment-answers/answers/export', true, 200, options);
            } else if (format === 'CSV') {
                call = surveySuperTest.get('/assessment-answers/answers/csv', true, 200, options);
            }
            return call.then((res) => {
                const controllerOptions = Object.assign({}, { questionId: options['question-id'],
                    sectionId: options['section-id'],
                    surveyId: options['survey-id'],
                    includeComments: options['include-comments'] });
                let answers;
                let expected = exportBuilder.getExpectedExportedAsessmentAnswerAnswers(controllerOptions);
                if (format === 'JSON') {
                    answers = res.body;
                    expected.forEach((e, indx) => {
                        // cheat questionIndex out of the comparison because we don't have access to them
                        // in the expected values
                        expect(answers[indx]).to.deep.equal(Object.assign({}, e, { questionIndex: answers[indx].questionIndex }));
                        expect(answers[indx].questionIndex).to.be.a('number');
                    });
                } else if (format === 'CSV') {
                    const csvConverter = new CSVConverterExport();
                    expected = expected.length ? csvConverter.dataToCSV(expected) : '';
                    // match against any integer value for questionIndex because we don't have access to them
                    // in the expected values
                    const expectedRegExpString = escapeRegExp(expected).replace(/"QUESTION_INDEX_CONSTANT"/g, '\\d+');
                    expect(res.text).to.match(new RegExp(expectedRegExpString));
                }
            });
        };
    };

    it('login as super', shared.loginFn(config.superUser));
    _.range(1, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers JSON, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ 'question-id': index, 'include-comments': false, 'survey-id': 1 }, 'JSON'));
    });

    _.range(1, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers JSON with comments, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ 'question-id': index, 'include-comments': true, 'survey-id': 1 }, 'JSON'));
    });

    _.range(1, questionCount + 1).forEach((index) => {
        it(`exported assessment-answers CSV, surveyId: 1, questionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ 'question-id': index, 'survey-id': 1 }, 'CSV'));
    });


    _.range(questionCount, questionSectionCount).forEach((index) => {
        it(`create question ${index}`, questionTests.createQuestionFn());
        it(`get question ${index}`, questionTests.getQuestionFn(index));
    });


    const surveyOpts2 = { noneRequired: true, noSection: false };
    it('create survey 1 with sections', surveyTests.createSurveyQxHxFn(_.range(questionCount, questionSectionCount), surveyOpts2));

    _.range(nameCount).forEach((nameIndex) => {
        _.range(stageCount).forEach((stage) => {
            const name = `name_${nameIndex + 3}`;
            const override = { name, stage, group: String(nameIndex + 3) };
            it(`create assessment ${name} ${stage}`, assessmentTests.createAssessmentFn([1], override));
        });
    });
    it('logout as super', shared.logoutFn());

    assessmentIndexSet = new Set();
    answerSessionSections.forEach((answersSpec) => {
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
                    tests.copyAssessmentAnswersFn(userIndex, 1, assessmentIndex, prevAssessmentIndex));
            }
        }


        it(`user ${userIndex} creates assessesment ${name} ${stage}`,
            tests.createAssessmentAnswersFn(userIndex, 1, questionIndices, assessmentIndex, commentIndices, 'en'));
        it(`user ${userIndex} gets answers  assessesment ${name} ${stage}`,
            tests.getAssessmentAnswersFn(userIndex, 1, assessmentIndex));

        it(`logout as user ${userIndex}`, shared.logoutFn());
    });

    it('login as super', shared.loginFn(config.superUser));
    _.range(sectionCount).forEach((index) => {
        it(`exported assessment-answers JSON no comments, surveyId: 2, sectionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ 'section-id': index + 1, 'survey-id': 2, 'include-comments': false }, 'JSON'));
    });

    _.range(sectionCount).forEach((index) => {
        it(`exported assessment-answers JSON with comments, surveyId: 2, sectionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ 'section-id': index + 1, 'survey-id': 2, 'include-comments': true }, 'JSON'));
    });

    _.range(sectionCount).forEach((index) => {
        it(`exported assessment-answers CSV, surveyId: 2, sectionId: ${index + 1}`,
            verifyExportAssessmentAnswers({ 'section-id': index + 1, 'survey-id': 2 }, 'CSV'));
    });

    it('export assessment answers no questionId or sectionId JSON', verifyExportAssessmentAnswers({ 'survey-id': 1 }, 'JSON'));
    it('export assessment answers no questionId or sectionId JSON', verifyExportAssessmentAnswers({ 'survey-id': 2 }, 'JSON'));
    it('export assessment answers no questionId or sectionId JSON comments', verifyExportAssessmentAnswers({ 'survey-id': 1, 'include-comments': true }, 'JSON'));
    it('export assessment answers no questionId or sectionId CSV', verifyExportAssessmentAnswers({ 'survey-id': 1 }, 'CSV'));

    const verifyErrorMsg = function (options, error) {
        const controllerOptions = { 'survey-id': options.surveyId,
            'question-id': options.questionId,
            'include-comments': options.includeComments,
            'section-id': options.sectionId };
        return function verify() {
            return surveySuperTest.get('/assessment-answers/answers/export', true, 400, controllerOptions)
            .then(res => shared.verifyErrorMessage(res, error));
        };
    };

    it('verifyErrorMsgBothQuestionIdSectionId', verifyErrorMsg({ questionId: 1, surveyId: 1, sectionId: 1 }, 'surveyBothQuestionsSectionsSpecified'));

    it('verifyErrorMsgQuestionNotFound', verifyErrorMsg({ questionId: 30, surveyId: 1 }, 'qxNotFound'));

    it('verifyErrorMsgSectionNotFound', verifyErrorMsg({ sectionId: 2, surveyId: 1, includeComments: false }, 'sectionNotFound'));

    it('verifyErrorMsgSurveyNotFound', verifyErrorMsg({ sectionId: 1, surveyId: 5 }, 'surveyNotFound'));

    it('export questions to csv', (done) => {
        surveySuperTest.get('/questions/csv', true, 200)
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'question.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('export sections to csv', (done) => {
        surveySuperTest.get('/sections/csv', true, 200)
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'section.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('export surveys to csv', (done) => {
        surveySuperTest.get('/surveys/csv', true, 200)
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'survey.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('export assessments to csv', (done) => {
        surveySuperTest.get('/assessments/csv', true, 200)
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'assessment.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('export assessment answers to csv', (done) => {
        surveySuperTest.get('/assessment-answers/csv', true, 200)
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'assessmentanswer.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('export assessment answer answers survey 1 to csv', (done) => {
        surveySuperTest.get('/assessment-answers/answers/csv', true, 200, { 'survey-id': 1 })
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'assessmentAnswerAnswersSurvey1.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('export assessment answer answers survey 2 to csv', (done) => {
        surveySuperTest.get('/assessment-answers/answers/csv', true, 200, { 'survey-id': 2 })
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'assessmentAnswerAnswersSurvey2.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('logout as super', shared.logoutFn());

    it('reset database', shared.setUpFn());

    it('reset user history', function resetUserHistory() {
        hxUser.reset();
    });

    let questionIdMap;

    it('login as super', shared.loginFn(config.superUser));

    it('import question csv into db', (done) => {
        const filepath = path.join(generatedDirectory, 'question.csv');
        surveySuperTest.postFile('/questions/csv', 'questioncsv', filepath, null, 201)
            .expect((res) => {
                questionIdMap = res.body;
            })
            .end(done);
    });

    let sectionIdMap;

    it('import section csv into db', (done) => {
        const filepath = path.join(generatedDirectory, 'section.csv');
        surveySuperTest.postFile('/sections/csv', 'sectioncsv', filepath, null, 201)
            .expect((res) => {
                sectionIdMap = res.body;
            })
            .end(done);
    });
    let surveyIdMap;

    it('import survey csv into db', (done) => {
        const filepath = path.join(generatedDirectory, 'survey.csv');
        const questionidmap = JSON.stringify(questionIdMap);
        const sectionidmap = JSON.stringify(sectionIdMap);
        surveySuperTest.postFile('/surveys/csv', 'surveycsv', filepath, { questionidmap, sectionidmap }, 201)
            .expect((res) => {
                surveyIdMap = res.body;
            })
            .end(done);
    });

    let assessmentIdMap;

    it('import assessment csv into db', (done) => {
        const filepath = path.join(generatedDirectory, 'assessment.csv');
        surveySuperTest.postFile('/assessments/csv', 'assessmentscsv', filepath, { }, 201)
            .expect((res) => {
                assessmentIdMap = res.body;
            })
            .end(done);
    });

    it('import assessment-answers csv into db', (done) => {
        const filepath = path.join(generatedDirectory, 'assessmentAnswer.csv');
        const assessmentidmap = JSON.stringify(assessmentIdMap);
        surveySuperTest.postFile('/assessment-answers/csv', 'assessmentAnswercsv', filepath, { assessmentidmap }, 204)
            .expect(() => {})
            .end(done);
    });

    it('import assessment-answer-answers survey 1 csv into db', (done) => {
        const filepath = path.join(generatedDirectory, 'assessmentAnswerAnswersSurvey1.csv');
        const assessmentidmap = JSON.stringify(assessmentIdMap);
        const useridmap = JSON.stringify(userIdMap);
        const questionidmap = JSON.stringify(questionIdMap);
        const surveyidmap = JSON.stringify(surveyIdMap);
        surveySuperTest.postFile('/assessment-answers/answers/csv', 'assessmentAnswerAnswerscsv', filepath, { assessmentidmap, useridmap, surveyidmap, questionidmap }, 204)
            .expect(() => {})
            .end(done);
    });

    it('import assessment-answer-answers survey 2 csv into db', (done) => {
        const filepath = path.join(generatedDirectory, 'assessmentAnswerAnswersSurvey2.csv');
        const assessmentidmap = JSON.stringify(assessmentIdMap);
        const useridmap = JSON.stringify(userIdMap);
        const questionidmap = JSON.stringify(questionIdMap);
        const surveyidmap = JSON.stringify(surveyIdMap);
        surveySuperTest.postFile('/assessment-answers/answers/csv', 'assessmentAnswerAnswerscsv', filepath, { assessmentidmap, useridmap, surveyidmap, questionidmap }, 204)
            .expect((res) => {
                assessmentIdMap = res.body;
            })
            .end(done);
    });
});
