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
        this.hxAnswer = options.hxAnswer;
        this.tests = options.tests;
    }

    formatAnswerJSON(currExpected, options) {
        const hxSurvey = this.hxSurvey;
        const hxQuestion = this.hxQuestion;
        const expected = Object.assign({}, currExpected);
        const questionAnswer = expected.answers.find(answer => answer.questionId === options.questionId);
        const answer = questionAnswer.answer;
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


    getExpectedExportedAsessmentAnswers(options) {
        const hxSurvey = this.hxSurvey;
        const tests = this.tests;
        const expectedWithDuplicates = _.filter(tests.hxAnswer.store, answers => _.filter(answers.answers, answer => answer.questionId === options.questionId).length
                    && hxSurvey.id(answers.surveyIndex) === options.surveyId);
        let expected = filterDuplicates(expectedWithDuplicates);
        expected = expected.map(currExpected => this.formatAnswerJSON(currExpected, options));
        expected = _.flatten(expected);
        return expected;
    }


};

module.exports = {
    AssessmentAnswerExportBuilder,
};
