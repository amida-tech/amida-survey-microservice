'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const _ = require('lodash');

const filterDuplicateAssessmentAnswers = function filterDuplicates(duplicates) {
    const expected = [];
    let groupByAssessmentId = _.groupBy(duplicates, answer => answer.ownerId);
    _.each(groupByAssessmentId,assessments => {
        expected.push(assessments.pop());
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
        const hxAssessment = this.hxAssessment;
        const expected = Object.assign({}, currExpected);
        const questionAnswer = expected.answers.find(answer => answer.questionId === options.questionId);
        const answer = questionAnswer.answer;

        if (answer) {
            let question =  hxQuestion.serverById(questionAnswer.questionId);
            let survey = hxSurvey.clients[expected.surveyIndex];
            let assessment = hxAssessment.idIndex[expected.ownerId + 1];

            expected.surveyId = hxSurvey.id(expected.surveyIndex);
            expected.surveyName = hxSurvey.clients[expected.surveyIndex].name;
            expected.assessmentId = expected.ownerId + 1;
            expected.questionId = questionAnswer.questionId;
            expected.questionType = question.type;
            expected.stage = assessment.stage;
            expected.group = assessment.group;
            expected.meta = questionAnswer.meta || null;
            expected.weight = questionAnswer.weight || null;
            expected.questionInstruction = question.instruction || null
            expected.questionText = question.text || null;
            expected.code = answer.code || null;
            expected.choiceText = null;

            delete expected.surveyIndex;
            delete expected.remaining;
            delete expected.removed;
            delete expected.ownerId;
            delete expected.answers;

            if (answer.boolValue !== undefined) {
                expected.value = answer.boolValue ? 'true' : 'false';
            }  else if (answer.choice) {
                let choiceMapInput = question.choices.map(r => [r.id, r.text])
                let choiceTextMap = new Map(choiceMapInput);

                expected.choiceText = choiceTextMap.get(answer.choice) || null;
                expected.value = answer.textValue || null;

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
            } else if (answer.choices) {
                return this.formatChoicesAnswerJSON(expected, answer, options);
            } else if (!answer.choices && !answer.choices) {
                expected.choiceText = null;
            }

            return expected;
        }
        return [];
    }

    formatChoicesAnswerJSON(expected, answer) {

        const hxQuestion = this.hxQuestion;
        const choicesExpected = [];
        let question =  hxQuestion.serverById(expected.questionId);
        let choiceMapInput = question.choices.map(r => [r.id, r.text])
        let choiceTextMap = new Map(choiceMapInput);

        answer.choices.forEach((choice) => {
            const currExpected = Object.assign({}, expected);
            currExpected.choiceText = choiceTextMap.get(choice.id) || null;
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

        let expected = filterDuplicateAssessmentAnswers(expectedWithDuplicates);

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
