'use strict';

const _ = require('lodash');
const chai = require('chai');

const models = require('../../models');
const comparator = require('./comparator');
const AnswerHistory = require('./answer-history');
const modelsAnswerCommon = require('../../models/dao/answer-common');
const shared = require('./shared-answer');

const expect = chai.expect;

const expectedAnswerListForUser = function (userIndex, hxSurvey, hxAnswer) {
    const expectedRaw = hxAnswer.listFlatForUser(userIndex);
    const expected = expectedRaw.reduce((r, e) => {
        const survey = hxSurvey.server(e.surveyIndex);
        const idToType = new Map(survey.questions.map(question => [question.id, question.type]));
        const choiceIdToType = new Map();
        survey.questions.forEach((question) => {
            if (question.type === 'choices') {
                question.choices.forEach(choice => choiceIdToType.set(choice.id, choice.type));
            }
        });
        const surveyId = survey.id;
        e.answers.forEach((answer) => {
            const dbAnswers = modelsAnswerCommon.prepareAnswerForDB(answer.answer);
            dbAnswers.forEach((dbAnswer) => {
                const value = Object.assign({ surveyId, questionId: answer.questionId }, dbAnswer);
                value.questionType = idToType.get(value.questionId);
                if (Object.prototype.hasOwnProperty.call(value, 'value')) {
                    value.value = value.value.toString();
                }
                if (value.questionType === 'choices') {
                    value.choiceType = choiceIdToType.get(value.questionChoiceId);
                }
                r.push(value);
            });
        });
        return r;
    }, []);
    return expected;
};

const answersToSearchQuery = function (inputAnswers) {
    const questions = inputAnswers.map((inputAnswer) => {
        const id = inputAnswer.questionId;
        let answers = null;
        if (inputAnswer.answers) {
            answers = inputAnswer.answers.map(r => _.omit(r, 'multipleIndex'));
        } else if (inputAnswer.answer.choices) {
            answers = inputAnswer.answer.choices.map(c => ({ choice: c.id, boolValue: true }));
        } else {
            answers = [inputAnswer.answer];
        }
        return { id, answers };
    });
    return { questions };
};

const compareImportedAnswers = function (actual, rawExpected, maps) {
    const { userIdMap, questionIdMap } = maps;
    const expected = _.cloneDeep(rawExpected);
    expected.forEach((r) => {
        const questionIdInfo = questionIdMap[r.questionId];
        r.questionId = questionIdInfo.questionId;
        if (r.questionChoiceId) {
            const choicesIds = questionIdInfo.choicesIds;
            r.questionChoiceId = choicesIds[r.questionChoiceId];
        }
        if (userIdMap) {
            r.userId = userIdMap[r.userId];
        }
    });
    expect(actual).to.deep.equal(expected);
};

const SpecTests = class AnswerSpecTests {
    constructor(options) {
        this.generator = options.generator;
        this.hxUser = options.hxUser;
        this.hxSurvey = options.hxSurvey;
        this.hxQuestion = options.hxQuestion;
        this.hxAnswer = new AnswerHistory();
    }

    answerSurveyFn(userIndex, surveyIndex, qxIndices) {
        const generator = this.generator;
        const hxUser = this.hxUser;
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        const hxAnswer = this.hxAnswer;
        return function answerSurvey() {
            const userId = hxUser.id(userIndex);
            const survey = hxSurvey.server(surveyIndex);
            const answers = shared.generateAnswers(generator, survey, hxQuestion, qxIndices);
            const surveyId = survey.id;
            const input = { userId, surveyId, answers };
            const language = generator.nextLanguage();
            if (language) {
                input.language = language;
            }
            return models.answer.createAnswers(input)
                .then(() => hxAnswer.push(userIndex, surveyIndex, answers, language))
                .then(() => answers);
        };
    }

    getAnswersFn(userIndex, surveyIndex) {
        const hxUser = this.hxUser;
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        return function getAnswers() {
            const surveyId = hxSurvey.id(surveyIndex);
            const userId = hxUser.id(userIndex);
            return models.answer.getAnswers({ userId, surveyId })
                .then((result) => {
                    const expected = hxAnswer.expectedAnswers(userIndex, surveyIndex);
                    comparator.answers(expected, result);
                    hxAnswer.pushServer(userIndex, surveyIndex, result);
                });
        };
    }

    verifyAnsweredSurveyFn(userIndex, surveyIndex) {
        const hxUser = this.hxUser;
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        return function verifyAnsweredSurvey() {
            const userId = hxUser.id(userIndex);
            const survey = hxSurvey.server(surveyIndex);
            const { answers } = hxAnswer.getLast(userIndex, surveyIndex);
            return models.survey.getAnsweredSurvey(userId, survey.id)
                .then((answeredSurvey) => {
                    comparator.answeredSurvey(survey, answers, answeredSurvey);
                });
        };
    }

    listAnswersForUserFn(userIndex) {
        const hxUser = this.hxUser;
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        return function listAnswersForUser() {
            const userId = hxUser.id(userIndex);
            const expected = expectedAnswerListForUser(userIndex, hxSurvey, hxAnswer);
            return models.answer.listAnswers({ scope: 'export', userId })
                .then((answers) => {
                    expect(answers).to.deep.equal(expected);
                    return answers;
                });
        };
    }

    listAnswersForUsersFn(userIndices) {
        const hxUser = this.hxUser;
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        return function listAnswersForUsers() {
            const userIds = userIndices.map(index => hxUser.id(index));
            const expected = [];
            userIndices.forEach((index) => {
                const userExpected = expectedAnswerListForUser(index, hxSurvey, hxAnswer);
                const userId = hxUser.id(index);
                userExpected.forEach(r => Object.assign(r, { userId }));
                expected.push(...userExpected);
            });
            return models.answer.listAnswers({ scope: 'export', userIds })
                .then((answers) => {
                    const actual = _.sortBy(answers, ['userId', 'surveyId']);
                    expect(actual).to.deep.equal(expected);
                    return actual;
                });
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
    }

    answerSurveyFn(userIndex, surveyIndex, qxIndices) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        const hxAnswer = this.hxAnswer;
        return function answerSurvey() {
            const survey = hxSurvey.server(surveyIndex);
            const answers = shared.generateAnswers(generator, survey, hxQuestion, qxIndices);
            const input = {
                surveyId: survey.id,
                answers,
            };
            const language = generator.nextLanguage();
            if (language) {
                input.language = language;
            }
            return surveySuperTest.post('/answers', input, 204)
                .expect(() => {
                    hxAnswer.push(userIndex, surveyIndex, answers, language);
                })
                .then(() => answers);
        };
    }

    getAnswersFn(userIndex, surveyIndex) {
        const surveySuperTest = this.surveySuperTest;
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        return function getAnswers(done) {
            const surveyId = hxSurvey.id(surveyIndex);
            surveySuperTest.get('/answers', true, 200, { 'survey-id': surveyId })
                .expect((res) => {
                    const expected = hxAnswer.expectedAnswers(userIndex, surveyIndex);
                    comparator.answers(expected, res.body);
                    hxAnswer.pushServer(userIndex, surveyIndex, res.body);
                })
                .end(done);
        };
    }

    verifyAnsweredSurveyFn(userIndex, surveyIndex) {
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        const surveySuperTest = this.surveySuperTest;
        return function verifyAnsweredSurvey(done) {
            const survey = _.cloneDeep(hxSurvey.server(surveyIndex));
            const { answers } = hxAnswer.getLast(userIndex, surveyIndex);
            surveySuperTest.get(`/answered-surveys/${survey.id}`, true, 200)
                .expect((res) => {
                    comparator.answeredSurvey(survey, answers, res.body);
                })
                .end(done);
        };
    }

    listAnswersForUserFn(userIndex) {
        const surveySuperTest = this.surveySuperTest;
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        return function listAnswersForUser() {
            const expected = expectedAnswerListForUser(userIndex, hxSurvey, hxAnswer);
            return surveySuperTest.get('/answers/export', true, 200)
                .then((res) => {
                    expect(res.body).to.deep.equal(expected);
                    return res.body;
                });
        };
    }

    listAnswersForUsersFn(userIndices) {
        const surveySuperTest = this.surveySuperTest;
        const hxUser = this.hxUser;
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        return function listAnswersForUsers() {
            const userIds = userIndices.map(index => hxUser.id(index));
            const expected = [];
            userIndices.forEach((index) => {
                const userExpected = expectedAnswerListForUser(index, hxSurvey, hxAnswer);
                const userId = hxUser.id(index);
                userExpected.forEach(r => Object.assign(r, { userId }));
                expected.push(...userExpected);
            });
            const query = { 'user-ids': userIds };
            return surveySuperTest.get('/answers/multi-user-export', true, 200, query)
                .then((res) => {
                    const actual = _.sortBy(res.body, ['userId', 'surveyId']);
                    expect(actual).to.deep.equal(expected);
                    return actual;
                });
        };
    }
};

module.exports = {
    answersToSearchQuery,
    compareImportedAnswers,
    SpecTests,
    IntegrationTests,
};
