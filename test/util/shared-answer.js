'use strict';

const _ = require('lodash');

const generateComment = (function generateCommentFn() {
    let index = -1;

    return function generateCommentInner(questionId) {
        index += 1;
        const reason = (index % 2) ? 'agree' : 'disagree';
        const text = `text_${index}`;
        return { questionId, comment: { reason, text } };
    };
}());

const generateAnswerComments = function (hxQuestion, commentIndices) {
    return commentIndices.map((index) => {
        const questionId = hxQuestion.id(index);
        return generateComment(questionId);
    });
};

const generateAnswers = function (generator, survey, hxQuestion, qxIndices, commentIndices) {
    if (qxIndices) {
        const result = qxIndices.map((questionIndex) => {
            if (questionIndex < 0) {
                const questionId = hxQuestion.id(-questionIndex);
                return { questionId };
            }
            const question = hxQuestion.server(questionIndex);
            return generator.answerQuestion(question);
        });
        if (!commentIndices) {
            return result;
        }
        const comments = generateAnswerComments(hxQuestion, commentIndices);
        const commentsByQxId = _.keyBy(comments, 'questionId');
        const inserted = new Set();
        result.forEach((answer) => {
            const questionId = answer.questionId;
            const comment = commentsByQxId[questionId];
            if (comment) {
                inserted.add(questionId);
                Object.assign(answer, comment);
            }
        });
        comments.forEach((comment) => {
            const questionId = comment.questionId;
            if (!inserted.has(questionId)) {
                result.push(comment);
            }
        });
        return result;
    }
    if (commentIndices) {
        return generateAnswerComments(hxQuestion, commentIndices);
    }
    return generator.answerQuestions(survey.questions);
};

module.exports = {
    generateAnswers,
};
