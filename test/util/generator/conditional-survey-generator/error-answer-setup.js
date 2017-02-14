'use strict';

module.exports = [{
    surveyIndex: 0,
    caseIndex: 0,
    questionIndex: 3,
    noAnswers: [3, 6],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 0,
    caseIndex: 1,
    questionIndex: 3,
    skipCondition: false,
    noAnswers: [4],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 0,
    caseIndex: 2,
    questionIndex: 3,
    skipCondition: true,
    noAnswers: [4],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 1,
    caseIndex: 0,
    questionIndex: 5,
    noAnswers: [5],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 1,
    caseIndex: 1,
    questionIndex: 5,
    noAnswers: [6],
    skipCondition: true,
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 1,
    caseIndex: 2,
    questionIndex: 5,
    skipCondition: false,
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 2,
    caseIndex: 0,
    questionIndex: 3,
    noAnswers: [3, 4],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 2,
    caseIndex: 1,
    questionIndex: 3,
    noAnswers: [5],
    skipCondition: true,
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 2,
    caseIndex: 2,
    questionIndex: 3,
    skipCondition: false,
    noAnswers: [4],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 3,
    caseIndex: 0,
    questionIndex: 0,
    noAnswers: [0],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 3,
    caseIndex: 1,
    questionIndex: 0,
    noAnswers: [],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 4,
    caseIndex: 0,
    questionIndex: 2,
    noAnswers: [2],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 4,
    caseIndex: 1,
    questionIndex: 2,
    noAnswers: [4],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 5,
    caseIndex: 0,
    questionIndex: 2,
    noAnswers: [2],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 5,
    caseIndex: 1,
    questionIndex: 2,
    skipCondition: false,
    noAnswers: [3],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 5,
    caseIndex: 2,
    questionIndex: 2,
    skipCondition: true,
    noAnswers: [],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 6,
    caseIndex: 0,
    questionIndex: 1,
    noAnswers: [1],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 6,
    caseIndex: 1,
    questionIndex: 1,
    noAnswers: [],
    selectionChoice: [0, -1],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 6,
    caseIndex: 2,
    questionIndex: 1,
    noAnswers: [2, 3],
    selectionChoice: [1, -2],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 6,
    caseIndex: 3,
    questionIndex: 1,
    noAnswers: [2],
    selectionChoice: [1],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 7,
    caseIndex: 0,
    questionIndex: 3,
    noAnswers: [3],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 7,
    caseIndex: 1,
    questionIndex: 3,
    noAnswers: [4],
    selectionChoice: [1, -1],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 7,
    caseIndex: 2,
    questionIndex: 3,
    noAnswers: [],
    selectionChoice: [1],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 8,
    caseIndex: 0,
    questionIndex: 4,
    noAnswers: [4],
    multipleIndices: [0, 1],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 8,
    caseIndex: 1,
    questionIndex: 4,
    noAnswers: [],
    selectionChoice: [0, -1],
    multipleIndices: [],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 8,
    caseIndex: 2,
    questionIndex: 4,
    noAnswers: [],
    multipleIndices: [2],
    selectionChoice: [0],
    error: 'answerToBeSkippedAnswered'
}, {
    surveyIndex: 8,
    caseIndex: 3,
    questionIndex: 4,
    noAnswers: [],
    selectionChoice: [0, -2, -1],
    multipleIndices: [1],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 8,
    caseIndex: 4,
    questionIndex: 4,
    noAnswers: [],
    selectionChoice: [0, -2, -1],
    multipleIndices: [2],
    error: 'answerRequiredMissing'
}, {
    surveyIndex: 8,
    caseIndex: 5,
    questionIndex: 4,
    noAnswers: [],
    selectionChoice: [0, -3, -1],
    multipleIndices: [0, 1, 2],
    error: 'answerToBeSkippedAnswered'
    //}, { // Skip equivalent
    //    surveyIndex: 13,
    //    caseIndex: 0,
    //    questionIndex: 3,
    //    noAnswers: [3, 6],
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 13,
    //    caseIndex: 1,
    //    questionIndex: 3,
    //    skipCondition: false,
    //    noAnswers: [4],
    //    error: 'answerRequiredMissing'
    //}, {
    //    surveyIndex: 13,
    //    caseIndex: 2,
    //    questionIndex: 3,
    //    skipCondition: true,
    //    noAnswers: [4],
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 14,
    //    caseIndex: 0,
    //    questionIndex: 5,
    //    noAnswers: [5],
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 14,
    //    caseIndex: 1,
    //    questionIndex: 5,
    //    noAnswers: [6],
    //    skipCondition: true,
    //    error: 'answerRequiredMissing'
    //}, {
    //    surveyIndex: 14,
    //    caseIndex: 2,
    //    questionIndex: 5,
    //    skipCondition: false,
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 15,
    //    caseIndex: 0,
    //    questionIndex: 3,
    //    noAnswers: [3, 4],
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 15,
    //    caseIndex: 1,
    //    questionIndex: 3,
    //    noAnswers: [5],
    //    skipCondition: true,
    //    error: 'answerRequiredMissing'
    //}, {
    //    surveyIndex: 15,
    //    caseIndex: 2,
    //    questionIndex: 3,
    //    skipCondition: false,
    //    noAnswers: [4],
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 16,
    //    caseIndex: 0,
    //    questionIndex: 0,
    //    noAnswers: [0],
    //    error: 'answerRequiredMissing'
    //}, {
    //    surveyIndex: 16,
    //    caseIndex: 1,
    //    questionIndex: 0,
    //    noAnswers: [],
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 17,
    //    caseIndex: 0,
    //    questionIndex: 2,
    //    noAnswers: [2],
    //    error: 'answerToBeSkippedAnswered'
    //}, {
    //    surveyIndex: 17,
    //    caseIndex: 1,
    //    questionIndex: 2,
    //    noAnswers: [4],
    //    error: 'answerRequiredMissing'
}];
