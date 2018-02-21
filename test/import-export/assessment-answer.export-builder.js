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

const orderExpectedAnswerObjects = function orderExpectedAnswerObjects(expected) {
    return expected.map(e =>
         Object.assign({}, {
             surveyId: e.surveyId,
             questionId: e.questionId,
             questionType: e.questionType,
             assessmentId: e.assessmentId,
             userId: e.userId,
             meta: e.meta,
             value: e.value,
             group: e.group,
             stage: e.stage,
             surveyName: e.surveyName,
             weight: e.weight,
             date: e.date,
             questionText: e.questionText,
             questionInstruction: e.questionInstruction,
             choiceText: e.choiceText,
             choiceType: e.choiceType || '',
             code: e.code,
             comment: e.comment || {},
             commentHistory: e.commentHistory || []
         }));
};

const getAssessmentGroupMap = function getAssessmentGroupMap(hxAssessment) {
    const assessmentGroup = new Map();
    hxAssessment.listServers().forEach((assessment) => {
        assessmentGroup[assessment.id] = assessment.group;
    });
    return assessmentMap
}

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
            expected.weight = questionAnswer.weight || '';
            expected.questionInstruction = question.instruction || '';
            expected.questionText = question.text || '';
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

    sortExpected(expected, options) {
        const questionLineMap = new Map();

        this.hxSurvey.clients[options.surveyId - 1].questions.forEach((e, indx) => {
            questionLineMap[e.id] = indx;
        });
        if (options.questionId || options.questionId === 0) {
            return _.sortBy(expected, a => a.assessmentId);
        }
        return _.sortBy(expected, [a => a.group, a => questionLineMap[a.questionId]]);
    }

    getExpectedByQuestionId(options) {
        const hxSurvey = this.hxSurvey;
        const hxAnswer = this.hxAnswer;
        const expectedWithDuplicates =
        _.filter(hxAnswer.store, answers => _.some(answers.answers, answer => answer.questionId === options.questionId) &&
                   hxSurvey.id(answers.surveyIndex) === options.surveyId);

        let expected = filterDuplicateAssessmentAnswers(expectedWithDuplicates);
        expected = expected.map(currExpected => this.formatAnswerJSON(currExpected, options));
        expected = _.flatten(expected);
        expected = this.filterForLatestStage(expected);
        expected = orderExpectedAnswerObjects(expected);
        return expected;
    }
    appendCommentByAssessmentAnswer(answer) {
        const hxAnswer = this.hxAnswer;
        const hxAssessment = this.hxAssessment;
        let answerKey = `${answer.assessmentId - 1}` + "-" + `${answer.surveyId - 1}` + "-" + answer.questionId;
        let comment = hxAnswer.comments[answerKey] ? hxAnswer.comments[answerKey] : {};
    //    console.log(this.hxAnswer.expectedAnswers(11, 0,{}));
        // Object.assign(answer, comment);
         // console.log(hxAnswer.expectedAnswers(11, 0, {group:[0]}))
         console.log(hxAnswer.comments)
        _.each(hxAnswer.comments, (commentObject, key) => {
            let comment = commentObject.comment;
            let commentQid = key.match(/\d{1,2}-\d{1,2}-(\d{1,2})/)[1]


        })
        // let commentMap = new Map;
        // commentMap[5] = []
        // _.each(hxAnswer.comments, (commentObject, key) => {
        //     let comment = commentObject.comment;
        //     let commentQid = key.match(/\d{1,2}-\d{1,2}-(\d{1,2})/)[1];
        //     if(commentMap[commentQid]) {
        //         commentMap[commentQid].push(comment);
        //     } else {
        //         else
        //     }
        // })

        //console.log(hxAnswer.getGroupComments(answer.group, answer.assessmentId - 1, answer.surveyId - 1))
    //    console.log(hxAnswer.expectedAnswers(answer.assessmentId - 1, 0,[answer.group]))
//         console.log("group comments")
         // console.log(hxAnswer.getGroupComments([answer.group], answer.assessmentId - 1, 0))
// console.log("\n\n\n")
    }


    getExpectedExportedAsessmentAnswers(options) {
        const hxSurvey = this.hxSurvey;
        let expected;
        if (!options.questionId && options.questionId !== 0) {
            expected = [];
            hxSurvey.clients[options.surveyId - 1].questions.forEach((q) => {
                const currOptions = Object.assign({ questionId: q.id }, options);
                expected.push(this.getExpectedByQuestionId(currOptions));
            });
            expected = _.flatten(expected);
        } else {
            expected = this.getExpectedByQuestionId(options);
        }
        expected.forEach(e => {
            this.appendCommentByAssessmentAnswer(e);
        })


        return this.sortExpected(expected, options);
    }


};

module.exports = {
    AssessmentAnswerExportBuilder,
};
