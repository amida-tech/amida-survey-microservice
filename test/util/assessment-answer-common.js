'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const chai = require('chai');
const _ = require('lodash');

const models = require('../../models');
const comparator = require('./comparator');
const AnswerHistory = require('./answer-history');
const sharedAnswer = require('./shared-answer');

const expect = chai.expect;

const findMax = function (answerSession, property) {
    return 1 + answerSession.reduce((r, q) => {
        r = Math.max(r, q[property]);
        return r;
    }, 0);
};

const findQuestionCount = function (answerSession) {
    return answerSession.reduce((r, { questions, commentQuestions }) => {
        if (questions) {
            questions.forEach((question) => {
                r = Math.max(r, question + 1);
            });
        }
        if (commentQuestions) {
            commentQuestions.forEach((question) => {
                r = Math.max(r, question + 1);
            });
        }
        return r;
    }, 0);
};

const findAnswerCommentsCount = function (answers) {
    return answers.reduce((r, answer) => {
        if (answer.comment) {
            return r + 1;
        }
        return r;
    }, 0);
};

const findGroup = function (hxAssessment, assessmentIndex) {
    const allClients = hxAssessment.listClientsWithIndex();
    const thisClient = hxAssessment.client(assessmentIndex);
    return allClients.reduce((r, { client, index }) => {
        if (assessmentIndex === index) {
            return r;
        }
        if (thisClient.group !== client.group) {
            return r;
        }
        r.push(index);
        return r;
    }, []);
};


const SpecTests = class AnswerSpecTests {
    constructor(options) {
        this.generator = options.generator;
        this.shared = options.shared;
        this.hxUser = options.hxUser;
        this.hxSurvey = options.hxSurvey;
        this.hxQuestion = options.hxQuestion;
        this.hxAssessment = options.hxAssessment;
        this.hxAnswer = new AnswerHistory();
        this.mapAnswers = new Map();
        this.mapStatus = new Map();
    }

    createAssessmentAnswersFn(userIndex, surveyIndex, qxIndices, assessmentIndex, commentIndices, languageOverride) {
        const generator = this.generator;
        const hxUser = this.hxUser;
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        const hxAnswer = this.hxAnswer;
        const hxAssessment = this.hxAssessment;
        return function createAssessmentAnswer() {
            const userId = hxUser.id(userIndex);
            const survey = hxSurvey.server(surveyIndex);
            const answers = sharedAnswer.generateAnswers(generator, survey, hxQuestion, qxIndices, commentIndices); // eslint-disable-line max-len
            const commentCount = findAnswerCommentsCount(answers);
            expect(commentCount).to.equal((commentIndices && commentIndices.length) || 0);
            const surveyId = survey.id;
            const input = { userId, surveyId, answers };
            const assessmentId = hxAssessment.id(assessmentIndex);
            input.assessmentId = assessmentId;
            const language = languageOverride || generator.nextLanguage();

            if (language) {
                input.language = language;
            }
            return models.assessmentAnswer.createAssessmentAnswers(input)
                .then(() => {
                    hxAnswer.push(assessmentIndex, surveyIndex, answers, language, userId);
                })
                .then(() => answers);
        };
    }

    getAssessmentAnswersFn(userIndex, surveyIndex, assessmentIndex = null) {
        const hxAnswer = this.hxAnswer;
        const hxAssessment = this.hxAssessment;
        return function getAssessmentAnswers() {
            const masterId = {};
            const assessmentId = hxAssessment.id(assessmentIndex);
            const group = findGroup(hxAssessment, assessmentIndex);
            Object.assign(masterId, { assessmentId });
            return models.assessmentAnswer.getAssessmentAnswersOnly(masterId)
                .then((result) => {
                    const masterIndex = assessmentIndex === null ? userIndex : assessmentIndex;
                    const expected = hxAnswer.expectedAnswers(assessmentIndex, surveyIndex, { group });
                    comparator.answers(expected, result);
                    hxAnswer.pushServer(masterIndex, surveyIndex, result);
                });
        };
    }

    copyAssessmentAnswersFn(userIndex, surveyIndex, assessmentIndex, prevIndex) {
        const hxUser = this.hxUser;
        const hxAnswer = this.hxAnswer;
        const hxAssessment = this.hxAssessment;
        return function answerSurvey() {
            const userId = hxUser.id(userIndex);
            const assessmentId = hxAssessment.id(assessmentIndex);
            const prevAssessmentId = hxAssessment.id(prevIndex);
            const input = { userId, assessmentId, prevAssessmentId };
            return models.assessmentAnswer.copyAssessmentAnswers(input)
                .then(() => {
                    const options = { ignoreComments: true };
                    const prevExpected = hxAnswer.expectedAnswers(prevIndex, surveyIndex, options);
                    hxAnswer.copyAssessmentAnswers(assessmentIndex, surveyIndex, prevIndex, userId);
                    const expected = hxAnswer.expectedAnswers(assessmentIndex, surveyIndex);
                    expect(expected).to.deep.equal(prevExpected);
                });
        };
    }

    verifyStatusFn(userIndex, assessmentIndex, expectedStatus) {
        const self = this;
        return function verifyStatus() {
            const userId = self.hxUser.id(userIndex);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            return models.assessmentAnswer.getAssessmentAnswersStatus({ userId, assessmentId })
                .then(status => expect(status).to.equal(expectedStatus));
        };
    }

    verifyAssessmentAnswersListFn(statusList, group, indices) {
        const hxAssessment = this.hxAssessment;
        return function verifyAssessmentAnswerList() {
            const options = group ? { group } : undefined;
            return models.assessmentAnswer.getAssessmentAnswersList(options)
                .then((list) => {
                    let expected = hxAssessment.listServers();
                    if (indices) {
                        expected = indices.map(index => expected[index]);
                        expected = _.cloneDeep(expected);
                    }
                    expected.forEach((r, index) => {
                        r.status = statusList[index];
                    });
                    expect(list).to.deep.equal(expected);
                });
        };
    }

    verifyAssessmentAnswersFn(userIndex, assessmentIndex, status) {
        const self = this;
        return function verifyAssessmentAnswers() {
            const userId = self.hxUser.id(userIndex);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            return models.assessmentAnswer.getAssessmentAnswers({ userId, assessmentId })
                .then((result) => {
                    const expected = self.mapAnswers.get(assessmentIndex) || [];
                    expect(result.status).to.equal(status);
                    comparator.answers(expected, result.answers);
                });
        };
    }

    createAssessmentAnswersFullFn(userIndex, assessmentIndex, status) {
        const self = this;
        return function createAssessmentAnswersFul() {
            const survey = self.hxSurvey.server(0);
            const answers = self.generator.answerQuestions(survey.questions);
            const userId = self.hxUser.id(userIndex);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status,
                userId,
                assessmentId,
            };
            return models.assessmentAnswer.createAssessmentAnswers(input)
                .then(() => self.mapAnswers.set(assessmentIndex, answers))
                .then(() => self.mapStatus.set(assessmentIndex, status));
        };
    }

    createAssessmentAnswersPartialFn(userIndex, assessmentIndex) {
        const self = this;
        return function answerSurveyPartial() {
            const survey = self.hxSurvey.server(0);
            const requiredQuestions = survey.questions.filter(question => question.required);
            expect(requiredQuestions).to.have.length.above(0);
            const questions = survey.questions.filter(question => !question.required);
            const answers = self.generator.answerQuestions(questions);
            const userId = self.hxUser.id(userIndex);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status: 'in-progress',
                userId,
                assessmentId,
            };
            return models.assessmentAnswer.createAssessmentAnswers(input)
                .then(() => self.mapAnswers.set(assessmentIndex, answers))
                .then(() => self.mapStatus.set(assessmentIndex, 'in-progress'));
        };
    }

    createAssessmentAnswersPartialCompletedFn(userIndex, assessmentIndex) {
        const self = this;
        return function createAssessmentAnswersPartialCompleted() {
            const survey = self.hxSurvey.server(0);
            const requiredQuestions = survey.questions.filter(question => question.required);
            expect(requiredQuestions).to.have.length.above(0);
            const questions = survey.questions.filter(question => !question.required);
            const answers = self.generator.answerQuestions(questions);
            const userId = self.hxUser.id(userIndex);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status: 'completed',
                userId,
                assessmentId,
            };
            return models.assessmentAnswer.createAssessmentAnswers(input)
                .then(self.shared.throwingHandler, self.shared.expectedErrorHandler('answerRequiredMissing'));
        };
    }

    createAssessmentAnswersMissingPlusCompletedFn(userIndex, assessmentIndex) {
        const self = this;
        return function createAssessmentAnswersMissingPlusCompleted() {
            const survey = self.hxSurvey.server(0);
            const requiredQuestions = survey.questions.filter(question => question.required);
            expect(requiredQuestions).to.have.length.above(0);
            const notRequiredQuestions = survey.questions.filter(question => !question.required);
            expect(notRequiredQuestions).to.have.length.above(0);
            const questions = [...requiredQuestions, notRequiredQuestions[0]];
            const answers = self.generator.answerQuestions(questions);
            const userId = self.hxUser.id(userIndex);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status: 'completed',
                userId,
                assessmentId,
            };
            const key = assessmentIndex;
            return models.assessmentAnswer.createAssessmentAnswers(input)
                .then(() => {
                    const qxIdsNewlyAnswered = new Set(answers.map(answer => answer.questionId));
                    const fn = answer => !qxIdsNewlyAnswered.has(answer.questionId);
                    const previousAnswers = self.mapAnswers.get(assessmentIndex).filter(fn);
                    self.mapAnswers.set(key, [...previousAnswers, ...answers]);
                })
                .then(() => self.mapStatus.set(key, 'completed'));
        };
    }
};

const IntegrationTests = class AnswerIntegrationTests {
    constructor(surveySuperTest, options) {
        this.surveySuperTest = surveySuperTest;
        this.generator = options.generator;
        this.hxUser = options.hxUser;
        this.hxSurvey = options.hxSurvey;
        this.hxQuestion = options.hxQuestion;
        this.hxAnswer = new AnswerHistory();
        this.hxAssessment = options.hxAssessment;
        this.shared = options.shared;
        this.mapAnswers = new Map();
        this.mapStatus = new Map();
    }

    createAssessmentAnswersFn(userIndex, surveyIndex, qxIndices, assessmentIndex, commentIndices, languageOverride) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        const hxAnswer = this.hxAnswer;
        const hxAssessment = this.hxAssessment;
        const hxUser = this.hxUser;
        return function answerSurvey() {
            const survey = hxSurvey.server(surveyIndex);
            const answers = sharedAnswer.generateAnswers(generator, survey, hxQuestion, qxIndices, commentIndices); // eslint-disable-line max-len
            const commentCount = findAnswerCommentsCount(answers);
            expect(commentCount).to.equal((commentIndices && commentIndices.length) || 0);
            const input = { answers };
            const assessmentId = hxAssessment.id(assessmentIndex);
            const language = languageOverride || generator.nextLanguage();
            if (language) {
                input.language = language;
            }
            const userId = hxUser.id(userIndex);
            return surveySuperTest.post(`/assessment-answers/${assessmentId}`, input, 204)
                .then(() => {
                    hxAnswer.push(assessmentIndex, surveyIndex, answers, language, userId);
                })
                .then(() => answers);
        };
    }

    getAssessmentAnswersFn(userIndex, surveyIndex, assessmentIndex = null) {
        const surveySuperTest = this.surveySuperTest;
        const hxAnswer = this.hxAnswer;
        const hxAssessment = this.hxAssessment;
        return function getAnswers() {
            const group = findGroup(hxAssessment, assessmentIndex);
            const assessmentId = hxAssessment.id(assessmentIndex);
            return surveySuperTest.get(`/assessment-answers/${assessmentId}/answers`, true, 200)
                .then((res) => {
                    const expected = hxAnswer.expectedAnswers(assessmentIndex, surveyIndex, { group });
                    comparator.answers(expected, res.body);
                    hxAnswer.pushServer(assessmentIndex, surveyIndex, res.body);
                });
        };
    }

    copyAssessmentAnswersFn(userIndex, surveyIndex, assessmentIndex, prevIndex) {
        const surveySuperTest = this.surveySuperTest;
        const hxAnswer = this.hxAnswer;
        const hxAssessment = this.hxAssessment;
        const hxUser = this.hxUser;
        return function answerSurvey() {
            const assessmentId = hxAssessment.id(assessmentIndex);
            const prevAssessmentId = hxAssessment.id(prevIndex);
            const input = { prevAssessmentId };
            const userId = hxUser.id(userIndex);

            return surveySuperTest.post(`/assessment-answers/${assessmentId}/as-copy`, input, 204)
                .then(() => {
                    const options = { ignoreComments: true };
                    const prevExpected = hxAnswer.expectedAnswers(prevIndex, surveyIndex, options);
                    hxAnswer.copyAssessmentAnswers(assessmentIndex, surveyIndex, prevIndex, userId);
                    const expected = hxAnswer.expectedAnswers(assessmentIndex, surveyIndex);
                    expect(expected).to.deep.equal(prevExpected);
                });
        };
    }

    verifyStatusFn(userIndex, assessmentIndex, expectedStatus) {
        const self = this;
        return function verifyStatus() {
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            return self.surveySuperTest.get(`/assessment-answers/${assessmentId}/status`, true, 200)
                .then(res => expect(res.body.status).to.equal(expectedStatus));
        };
    }

    verifyAssessmentAnswersListFn(statusList, options = {}, indices) {
        const self = this;
        const hxAssessment = this.hxAssessment;
        return function verifyAssessmentAnswerList() {
            const query = (options.group || options.assessmentAnswersStatus) ?
                          { group: options.group, 'assessment-answers-status': options.assessmentAnswersStatus } :
                           undefined;
            return self.surveySuperTest.get('/assessment-answers', true, 200, query)
                .then((res) => {
                    let expected = hxAssessment.listServers();
                    if (indices) {
                        expected = indices.map(index => expected[index]);
                        expected = _.cloneDeep(expected);
                    }
                    expected.forEach((r, index) => {
                        r.status = statusList[index];
                    });
                    if (options.assessmentAnswersStatus) {
                        expected = expected
                                   .filter(r => r.status === options.assessmentAnswersStatus);
                    }
                    expect(res.body).to.deep.equal(expected);
                });
        };
    }

    verifyAssessmentAnswersFn(userIndex, assessmentIndex, status) {
        const self = this;
        return function verifyAssessmentAnswers() {
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            return self.surveySuperTest.get(`/assessment-answers/${assessmentId}`, true, 200)
                .then((res) => {
                    const expected = self.mapAnswers.get(assessmentIndex) || [];
                    expect(res.body.status).to.equal(status);
                    comparator.answers(expected, res.body.answers);
                });
        };
    }

    createAssessmentAnswersFullFn(userIndex, assessmentIndex, status) {
        const self = this;
        return function createAssessmentAnswersFul() {
            const survey = self.hxSurvey.server(0);
            const answers = self.generator.answerQuestions(survey.questions);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status,
            };
            return self.surveySuperTest.post(`/assessment-answers/${assessmentId}`, input, 204)
                .then(() => self.mapAnswers.set(assessmentIndex, answers))
                .then(() => self.mapStatus.set(assessmentIndex, status));
        };
    }

    createAssessmentAnswersPartialFn(userIndex, assessmentIndex) {
        const self = this;
        return function answerSurveyPartial() {
            const survey = self.hxSurvey.server(0);
            const requiredQuestions = survey.questions.filter(question => question.required);
            expect(requiredQuestions).to.have.length.above(0);
            const questions = survey.questions.filter(question => !question.required);
            const answers = self.generator.answerQuestions(questions);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status: 'in-progress',
            };
            return self.surveySuperTest.post(`/assessment-answers/${assessmentId}`, input, 204)
                .then(() => self.mapAnswers.set(assessmentIndex, answers))
                .then(() => self.mapStatus.set(assessmentIndex, 'in-progress'));
        };
    }

    createAssessmentAnswersPartialCompletedFn(userIndex, assessmentIndex) {
        const self = this;
        return function createAssessmentAnswersPartialCompleted() {
            const survey = self.hxSurvey.server(0);
            const requiredQuestions = survey.questions.filter(question => question.required);
            expect(requiredQuestions).to.have.length.above(0);
            const questions = survey.questions.filter(question => !question.required);
            const answers = self.generator.answerQuestions(questions);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status: 'completed',
            };
            return self.surveySuperTest.post(`/assessment-answers/${assessmentId}`, input, 400)
                .then(res => self.shared.verifyErrorMessage(res, 'answerRequiredMissing'));
        };
    }

    createAssessmentAnswersMissingPlusCompletedFn(userIndex, assessmentIndex) {
        const self = this;
        return function createAssessmentAnswersMissingPlusCompleted() {
            const survey = self.hxSurvey.server(0);
            const requiredQuestions = survey.questions.filter(question => question.required);
            expect(requiredQuestions).to.have.length.above(0);
            const notRequiredQuestions = survey.questions.filter(question => !question.required);
            expect(notRequiredQuestions).to.have.length.above(0);
            const questions = [...requiredQuestions, notRequiredQuestions[0]];
            const answers = self.generator.answerQuestions(questions);
            const assessmentId = self.hxAssessment.id(assessmentIndex);
            const input = {
                answers,
                status: 'completed',
            };
            const key = assessmentIndex;
            return self.surveySuperTest.post(`/assessment-answers/${assessmentId}`, input, 204)
                .then(() => {
                    const qxIdsNewlyAnswered = new Set(answers.map(answer => answer.questionId));
                    const fn = answer => !qxIdsNewlyAnswered.has(answer.questionId);
                    const previousAnswers = self.mapAnswers.get(assessmentIndex).filter(fn);
                    self.mapAnswers.set(key, [...previousAnswers, ...answers]);
                })
                .then(() => self.mapStatus.set(key, 'completed'));
        };
    }
};

module.exports = {
    SpecTests,
    IntegrationTests,
    findMax,
    findQuestionCount,
};
