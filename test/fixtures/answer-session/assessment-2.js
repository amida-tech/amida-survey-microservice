'use strict';

// Note: This json creates assessments in which stages are not re-visited after
//      they have been completed (as opposed to ./assessment-0.js)

module.exports = [{
    name: 0,
    stage: 0,
    user: 0,
    questions: [0, 1, 2, 3, 4],
}, {
    name: 0,
    stage: 1,
    user: 3,
    assessment: 1,
    questions: [3, 4, 6, 7],
}, {
    name: 1,
    stage: 0,
    user: 2,
    questions: [2, 3, 4, 5, 6],
}, {
    name: 1,
    stage: 1,
    user: 3,
    questions: [0, 2, 4, 5, 6],
}, {
    name: 0,
    stage: 2,
    user: 1,
    questions: [0, 2, 3, 5],
}, {
    name: 2,
    stage: 0,
    user: 7,
    questions: [1, 3, 5],
    commentQuestions: [2],
}, {
    name: 0,
    stage: 3,
    user: 4,
    questions: [0, 7, 8],
}, {
    name: 1,
    stage: 2,
    user: 0,
    questions: [0, 5, 2, 4],
}, {
    name: 1,
    stage: 3,
    user: 6,
    questions: [0, 5, 9],
}, {
    name: 2,
    stage: 1,
    user: 9,
    commentQuestions: [2, 3, 4],
}, {
    name: 2,
    stage: 2,
    user: 10,
    commentQuestions: [1, 2, 6],
}, {
    name: 2,
    stage: 3,
    user: 0,
    questions: [5],
    commentQuestions: [5, 2, 4],
}];
