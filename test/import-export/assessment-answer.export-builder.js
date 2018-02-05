'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const _ = require('lodash');

const filterDuplicates = function filterDuplicates(duplicates) {
    const expected = [];
    duplicates.forEach((curr1) => {
        const filtered = _.filter(duplicates, curr2 => curr1.userIndex === curr2.userIndex);
        if (filtered.length > 1 && !_.filter(expected, ele => ele.userIndex === curr1.userIndex).length) {
            expected.push(filtered[filtered.length - 1]);
        } else if (!_.filter(expected, ele => ele.userIndex === curr1.userIndex).length) {
            expected.push(curr1);
        }
    });

    return expected;
};

const AssessmentAnswerExportBuilder = class AssessmentAnswerExportBuilder {

    constructor(options) {
        this.hxSurvey = options.hxSurvey;
        this.hxQuestion = options.hxQuestion;
        this.hxAnswer = options.tests.hxAnswer;
        this.hxAssessment = options.hxAssessment;
    }

    formatAnswerJSON(currExpected, options) {
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        const expected = Object.assign({}, currExpected);
        const questionAnswer = expected.answers.find(answer => answer.questionId === options.questionId);
        const answer = questionAnswer.answer;

        if (answer) {
            expected.surveyId = hxSurvey.id(expected.surveyIndex);
            expected.assessmentId = expected.userIndex + 1;
            expected.questionId = questionAnswer.questionId;
            expected.questionType = hxQuestion.serverById(expected.questionId).type;

            delete expected.surveyIndex;
            delete expected.remaining;
            delete expected.removed;
            delete expected.userIndex;
            delete expected.answers;


            if (answer.boolValue !== undefined) {
                expected.value = answer.boolValue ? 'true' : 'false';
            } else if (answer.choices) {
                return this.formatChoicesAnswerJSON(expected, answer, options);
            } else if (answer.choice) {
                expected.questionChoiceId = answer.choice;
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
            }
            return expected;
        }
        return [];
    }

    formatChoicesAnswerJSON(expected, answer) {
        const hxQuestion = this.hxQuestion;
        const choicesExpected = [];
        answer.choices.forEach((choice) => {
            const currExpected = Object.assign({}, expected);

            currExpected.questionChoiceId = choice.id;
            currExpected.choiceType =
                hxQuestion.serverById(expected.questionId).choices.find(questionChoice => questionChoice.id === choice.id).type;
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
        const assessmentGroup = new Map();
        const latestAssessment = new Map();
        const finalExpected = [];


        hxAssessment.listServers().forEach((assessment) => {
            assessmentGroup[assessment.id] = assessment.group;
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

    getExpectedExportedAsessmentAnswers(options) {
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        const expectedWithDuplicates = _.filter(hxAnswer.store, answers => _.filter(answers.answers, answer => answer.questionId === options.questionId).length
                    && hxSurvey.id(answers.surveyIndex) === options.surveyId);
        let expected = filterDuplicates(expectedWithDuplicates);

        expected = expected.map(currExpected => this.formatAnswerJSON(currExpected, options));
        expected = _.flatten(expected);
        expected = this.filterForLatestStage(expected);
        expected = _.sortBy(expected, a => a.assessmentId);
        return expected;
    }


};

module.exports = {
    AssessmentAnswerExportBuilder,
};
