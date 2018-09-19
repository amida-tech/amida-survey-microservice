'use strict';

const _ = require('lodash');

const generateComment = (function generateCommentFn() {
    let index = -1;

    return function generateCommentInner() {
        index += 1;
        const reason = (index % 2) ? 'agree' : 'disagree';
        if (index % 4 === 3) {
            return { reason };
        }
        const text = `text_${index}`;
        return { reason, text };
    };
}());

const generateAnswersWithComments = function (hxQuestion, commentIndices) {
    return commentIndices.reduce((r, index) => {
        const questionId = hxQuestion.id(index);
        const comment = generateComment();
        const answerWithComments = { questionId, comment };
        r.push(answerWithComments);
        return r;
    }, []);
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
        const comments = generateAnswersWithComments(hxQuestion, commentIndices);
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
        return generateAnswersWithComments(hxQuestion, commentIndices);
    }
    return generator.answerQuestions(survey.questions);
};

module.exports = {
    generateAnswers,
};
