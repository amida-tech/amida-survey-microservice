'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const _ = require('lodash');

const filterDuplicateAssessmentAnswers = function filterDuplicates(duplicates) {
    const expected = [];
    const groupByAssessmentId = _.groupBy(duplicates, answer => answer.ownerId);
    _.each(groupByAssessmentId, (assessments) => {
        expected.push(assessments.pop());
    });

    return expected;
};

const orderExpectedAnswerObjects = function orderExpectedAnswerObjects(expected, options) {
    const includeComments = options.includeComments;
    return expected.map((e) => {
        const choices = !!e.choiceText;
        const includeMeta = !choices || (choices && e.choiceIndex === 0);
        const obj = Object.assign({}, {
            surveyId: e.surveyId,
            questionId: e.questionId,
            questionType: e.questionType,
            assessmentId: e.assessmentId,
            userId: e.userId,
            meta: includeMeta ? e.meta : {},
            value: e.value,
            group: e.group,
            stage: e.stage,
            surveyName: e.surveyName,
            weight: e.weight,
            date: e.date,
            questionText: e.questionText,
            questionInstruction: e.questionInstruction,
            questionIndex: e.questionIndex,
            questionChoiceId: e.questionChoiceId || '',
            choiceText: e.choiceText,
            choiceType: e.choiceType || '',
            code: e.code,

        });
        if (includeComments) {
            return Object.assign({}, obj, { comment: e.comment || {},
                commentHistory: e.commentHistory || [] });
        }
        return obj;
    });
};

const AssessmentAnswerExportBuilder = class AssessmentAnswerExportBuilder {

    constructor(options) {
        this.hxSurvey = options.hxSurvey;
        this.hxQuestion = options.hxQuestion;
        this.hxAnswer = options.tests.hxAnswer;
        this.hxAssessment = options.hxAssessment;
    }

    getAssessmentGroupMap() {
        const hxAssessment = this.hxAssessment;
        const assessmentGroup = new Map();
        hxAssessment.listServers().forEach((assessment) => {
            assessmentGroup[assessment.id] = assessment.group;
        });
        return assessmentGroup;
    }

    getQuestionLineMap(options) {
        const hxSurvey = this.hxSurvey;
        const questionLineMap = new Map();
        if (options.sectionId) {
            hxSurvey.clients[options.surveyId - 1].sections.forEach((section) => {
                section.questions.forEach((e, indx) => {
                    questionLineMap[e.id] = indx;
                });
            });
        } else if (hxSurvey.clients[options.surveyId - 1].questions) {
            hxSurvey.clients[options.surveyId - 1].questions.forEach((e, indx) => {
                questionLineMap[e.id] = indx;
            });
        } else {
            hxSurvey.clients[options.surveyId - 1].sections.forEach((sect, sectIndx) => {
                sect.questions.forEach((e, qIndx) => {
                    questionLineMap[e.id] = (sectIndx * 3) + qIndx;
                });
            });
        }

        return questionLineMap;
    }

    formatAnswerJSON(currExpected, options) {
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        const hxAssessment = this.hxAssessment;
        const expected = Object.assign({}, currExpected);
        const questionAnswer = expected.answers.find(answer => answer.questionId === options.questionId);
        const answer = questionAnswer.answer;
        if (answer) {
            const question = hxQuestion.serverById(questionAnswer.questionId);
            const assessment = hxAssessment.idIndex[expected.ownerId + 1];
            expected.surveyId = hxSurvey.id(expected.surveyIndex);
            expected.questionId = questionAnswer.questionId;
            expected.questionType = question.type;
            expected.assessmentId = expected.ownerId + 1;
            expected.surveyName = hxSurvey.clients[expected.surveyIndex].name;
            expected.stage = `${assessment.stage}`;
            expected.group = `${assessment.group}`;
            expected.meta = questionAnswer.meta || {};
            expected.weight = questionAnswer.weight || null;
            expected.questionInstruction = question.instruction || '';
            expected.questionText = question.text || '';
            expected.questionIndex = 'QUESTION_INDEX_CONSTANT';
            expected.code = answer.code || '';
            expected.choiceText = '';
            expected.choiceType = expected.choiceType || '';

            delete expected.surveyIndex;
            delete expected.remaining;
            delete expected.removed;
            delete expected.ownerId;
            delete expected.answers;

            if (answer.boolValue !== undefined) {
                expected.value = answer.boolValue ? 'true' : 'false';
            } else if (answer.choice) {
                const choiceMapInput = question.choices.map(r => [r.id, r.text]);
                const choiceTextMap = new Map(choiceMapInput);
                expected.choiceText = choiceTextMap.get(answer.choice) || '';
                expected.value = answer.textValue || '';
                expected.questionChoiceId = answer.choice;
                expected.choiceIndex = 0;
            } else if (answer.textValue) {
                expected.value = answer.textValue;
            } else if (answer.integerValue) {
                expected.value = String(answer.integerValue);
            } else if (answer.floatValue) {
                expected.value = String(answer.floatValue);
            } else if (answer.numberValue) {
                expected.value = String(answer.numberValue);
            } else if (answer.dateValue) {
                expected.value = String(answer.dateValue);
            } else if (answer.bloodPressureValue) {
                expected.value = `${answer.bloodPressureValue.systolic
                                  }-${
                                  answer.bloodPressureValue.diastolic}`;
            } else if (answer.dayValue) {
                expected.value = answer.dayValue;
            } else if (answer.monthValue) {
                expected.value = answer.monthValue;
            } else if (answer.feetInchesValue) {
                expected.value =
                `${answer.feetInchesValue.feet
                                  }-${
                                 answer.feetInchesValue.inches}`;
            } else if (answer.choices) {
                return this.formatChoicesAnswerJSON(expected, answer, options);
            } else if (answer.zipcodeValue) {
                expected.value = answer.zipcodeValue;
            } else if (!answer.choices && !answer.choices) {
                expected.choiceText = '';
            }

            return expected;
        }
        return [];
    }

    formatChoicesAnswerJSON(expected, answer) {
        const hxQuestion = this.hxQuestion;
        const choicesExpected = [];
        const question = hxQuestion.serverById(expected.questionId);
        const choiceMapInput = question.choices.map(r => [r.id, r.text]);
        const choiceTextMap = new Map(choiceMapInput);

        answer.choices.forEach((choice, indx) => {
            const currExpected = Object.assign({}, expected);
            currExpected.choiceText = choiceTextMap.get(choice.id) || null;
            currExpected.choiceType =
                hxQuestion.serverById(expected.questionId).choices.find(questionChoice => questionChoice.id === choice.id).type;
            currExpected.choiceIndex = indx;
            currExpected.questionChoiceId = choice.id;
            choicesExpected.push(currExpected);
            if (choice.textValue) {
                currExpected.value = choice.textValue;
            } else if (currExpected.choiceType === 'bool') {
                currExpected.value = 'true';
            }
        });

        expected = choicesExpected;
        return expected;
    }

    filterForLatestStage(expected) {
        const hxAssessment = this.hxAssessment;
        const assessmentGroup = this.getAssessmentGroupMap();
        const latestAssessment = new Map();
        const finalExpected = [];


        hxAssessment.listServers().forEach((assessment) => {
            if (latestAssessment[assessment.group] &&
                 assessment.stage > latestAssessment[assessment.group].stage) {
                latestAssessment[assessment.group] = assessment;
            } else if (!latestAssessment[assessment.group]) {
                latestAssessment[assessment.group] = assessment;
            }
        });

        expected.forEach((e) => {
            const group = assessmentGroup[e.assessmentId];
            if (latestAssessment[group].id === e.assessmentId) {
                finalExpected.push(e);
            }
        });

        return finalExpected;
    }

    sortExpected(expected, options) {
        const questionLineMap = this.getQuestionLineMap(options);
        if (options.questionId || options.questionId === 0) {
            return _.sortBy(expected, a => [a.group, b => b.choiceText]);
        }
        return _.sortBy(expected, [a => a.group, b => questionLineMap[b.questionId], c => c.choiceText]);
    }

    getExpectedByQuestionId(options) {
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        const expectedWithDuplicates =
        _.filter(hxAnswer.store, answers => _.some(answers.answers, answer => answer.questionId === options.questionId) && hxSurvey.id(answers.surveyIndex) === options.surveyId);

        let expected = filterDuplicateAssessmentAnswers(expectedWithDuplicates);
        expected = expected.map(currExpected => this.formatAnswerJSON(currExpected, options));
        expected = _.flatten(expected);
        expected = this.filterForLatestStage(expected);
        expected = orderExpectedAnswerObjects(expected, options);
        return expected;
    }
    appendCommentByAssessmentAnswer(answer) {
        const hxAnswer = this.hxAnswer;
        const assessmentGroup = this.getAssessmentGroupMap();
        const answerWithComments = Object.assign({}, answer);
        const answerKey = `${answer.assessmentId - 1}-${answer.surveyId - 1}-${answer.questionId}`;
        const comment = hxAnswer.comments[answerKey] ? hxAnswer.comments[answerKey].comment : {};
        let commentHistory = [];

        _.each(hxAnswer.comments, (commentObject, key) => {
            const currComment = commentObject.comment;
            const commentQuestionId = key.match(/\d{1,2}-\d{1,2}-(\d{1,2})/)[1];
            const commentOwnerId = key.match(/(\d{1,2})-\d{1,2}-\d{1,2}/)[1];
            if (`${answer.questionId}` === commentQuestionId &&
                assessmentGroup[commentOwnerId] === answer.group &&
               commentOwnerId !== `${answer.assessmentId - 1}`) {
                commentHistory.push(currComment);
            }
        });
        commentHistory = _.sortBy(commentHistory, c => c.reason);
        answerWithComments.comment = comment;
        answerWithComments.commentHistory = commentHistory;
        return answerWithComments;
    }


    getExpectedExportedAsessmentAnswerAnswers(options) {
        const hxSurvey = this.hxSurvey;
        let expected;
        if (options.sectionId) {
            expected = [];
            const section = _.find(hxSurvey.clients[options.surveyId - 1].sections, sect => sect.id === options.sectionId);

            if (section) {
                section.questions.forEach((q) => {
                    const currOptions = Object.assign({ questionId: q.id }, options);
                    expected.push(this.getExpectedByQuestionId(currOptions));
                });
                expected = _.flatten(expected);
            } else {
                expected = [];
            }
        } else if (!options.questionId && options.questionId !== 0) {
            expected = [];
            if (hxSurvey.clients[options.surveyId - 1].questions) {
                hxSurvey.clients[options.surveyId - 1].questions.forEach((q) => {
                    const currOptions = Object.assign({ questionId: q.id }, options);
                    expected.push(this.getExpectedByQuestionId(currOptions));
                });
            } else {
                hxSurvey.clients[options.surveyId - 1].sections.forEach((sect) => {
                    sect.questions.forEach((q) => {
                        const currOptions = Object.assign({ questionId: q.id }, options);
                        expected.push(this.getExpectedByQuestionId(currOptions));
                    });
                });
            }

            expected = _.flatten(expected);
        } else {
            expected = this.getExpectedByQuestionId(options);
        }
        if (options.includeComments) {
            expected = expected.map(e => this.appendCommentByAssessmentAnswer(e));
        }

        return this.sortExpected(expected, options);
    }
};

module.exports = {
    AssessmentAnswerExportBuilder,
};
