'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const _ = require('lodash');

const toAnswerRecord = function (answers, language) {
    const remaining = answers.reduce((r, answer, index) => {
        if (answer.answer || answer.answers) {
            r[answer.questionId] = index;
        }
        return r;
    }, {});
    language = language || 'en';
    answers = answers.reduce((r, answer) => {
        if (!answer.answer && !answer.answers && answer.comment) {
            return r;
        }
        const commentlessAnswer = _.omit(answer, 'comment');
        if (!commentlessAnswer.language) {
            Object.assign(commentlessAnswer, { language });
        }
        r.push(commentlessAnswer);
        return r;
    }, []);
    return { remaining, answers, removed: {} };
};

module.exports = class AnswerHistory {
    constructor() {
        this.historyIndexMap = new Map();
        this.store = [];
        this.serverStore = [];
        this.comments = {};
        this.instant = 0;
        this.questionsWithComments = {};
    }

    static key(userIndex, surveyIndex) {
        return `${userIndex}-${surveyIndex}`;
    }

    static commentKey(userIndex, surveyIndex, questionId) {
        return `${userIndex}-${surveyIndex}-${questionId}`;
    }

    updateRecords(userIndex, surveyIndex, answers) {
        const records = this.getAll(userIndex, surveyIndex);
        const timeIndex = records.length;
        records.forEach((record) => {
            const remaining = record.remaining;
            const removed = record.removed;
            answers.forEach((r) => {
                const questionId = r.questionId;
                if (!r.answer && !r.answers && r.comment) {
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(remaining, questionId)) {
                    delete remaining[questionId];
                    removed[questionId] = timeIndex;
                }
            });
        });
    }

    updateComments(userIndex, surveyIndex, answers, language, userId) {
        this.instant = this.instant + 1;
        const instant = this.instant;
        answers.forEach(({ questionId, comment: newComment }) => {
            if (newComment) {
                const commentKey = AnswerHistory.commentKey(userIndex, surveyIndex, questionId);
                const comment = Object.assign({}, newComment, {
                    language: language || 'en',
                }, { userId });

                this.comments[commentKey] = { comment, instant };
                const key = AnswerHistory.key(userIndex, surveyIndex);
                let questionsWithComments = this.questionsWithComments[key];
                if (!questionsWithComments) {
                    questionsWithComments = new Set();
                    this.questionsWithComments[key] = questionsWithComments;
                }
                questionsWithComments.add(questionId);
            }
        });
    }

    push(userIndex, surveyIndex, answers, language, userId) {
        this.updateRecords(userIndex, surveyIndex, answers);
        const key = AnswerHistory.key(userIndex, surveyIndex);
        let indexHistory = this.historyIndexMap.get(key);
        if (indexHistory === undefined) {
            indexHistory = [];
            this.historyIndexMap.set(key, indexHistory);
        }
        const index = this.store.length;
        const record = toAnswerRecord(answers, language);
        const value = Object.assign({ userIndex, surveyIndex }, record);
        this.store.push(value);
        this.serverStore.push(null);
        indexHistory.push(index);
        this.updateComments(userIndex, surveyIndex, answers, language, userId);
    }

    getLastIndex(userIndex, surveyIndex) {
        const key = AnswerHistory.key(userIndex, surveyIndex);
        const keyIndices = this.historyIndexMap.get(key);
        return keyIndices[keyIndices.length - 1];
    }

    pushServer(userIndex, surveyIndex, answers) {
        const index = this.getLastIndex(userIndex, surveyIndex);
        this.serverStore[index] = answers;
    }

    getLast(userIndex, surveyIndex) {
        const all = this.getAll(userIndex, surveyIndex);
        const length = all.length;
        return all[length - 1];
    }

    getLastServer(userIndex, surveyIndex) {
        const index = this.getLastIndex(userIndex, surveyIndex);
        return this.serverStore[index];
    }

    getAll(userIndex, surveyIndex) {
        const key = AnswerHistory.key(userIndex, surveyIndex);
        const keyIndices = this.historyIndexMap.get(key);
        if (!keyIndices) {
            return [];
        }
        return _.at(this.store, keyIndices);
    }

    getAllServer(userIndex, surveyIndex) {
        const key = AnswerHistory.key(userIndex, surveyIndex);
        const keyIndices = this.historyIndexMap.get(key);
        if (!keyIndices) {
            return [];
        }
        return _.at(this.serverStore, keyIndices);
    }

    listFlatForUser(userIndex) {
        return this.store.reduce((r, record) => {
            if (record.userIndex === userIndex) {
                const { surveyIndex, answers, remaining } = record;
                const remainingAnswers = answers.filter(({ questionId }) => Object.prototype.hasOwnProperty.call(remaining, questionId));
                if (remainingAnswers.length) {
                    r.push({ surveyIndex, answers: remainingAnswers });
                }
            }
            return r;
        }, []);
    }

    getGroupComments(group, userIndex, surveyIndex) {
        const result = group.reduce((r, groupIndex) => {
            const key = AnswerHistory.key(groupIndex, surveyIndex);
            const questionsWithComments = this.questionsWithComments[key];
            if (!questionsWithComments) {
                return r;
            }
            questionsWithComments.forEach((questionId) => {
                const commentKey = `${key}-${questionId}`;
                const comment = this.comments[commentKey];
                if (comment) {
                    const currentKey = AnswerHistory.commentKey(userIndex, surveyIndex, questionId);
                    let questionComments = r[currentKey];
                    if (!questionComments) {
                        questionComments = [];
                        r[currentKey] = questionComments;
                    }
                    questionComments.push(comment);
                }
            });
            return r;
        }, {});
        return Object.keys(result).reduce((r, key) => {
            const orderedComments = _.sortBy(result[key], 'instant');
            r[key] = orderedComments.map(({ comment }) => comment);
            return r;
        }, {});
    }

    getGroupQuestionsWithComments(group, userIndex, surveyIndex) {
        return group.reduce((r, groupIndex) => {
            const key = AnswerHistory.key(groupIndex, surveyIndex);
            const questionsWithComments = this.questionsWithComments[key];
            if (!questionsWithComments) {
                return r;
            }
            questionsWithComments.forEach((questionId) => {
                r.add(questionId);
            });
            return r;
        }, new Set());
    }

    expectedAnswers(userIndex, surveyIndex, options = {}) {
        const records = this.getAll(userIndex, surveyIndex);
        let preresult = records.reduce((r, { remaining, answers }) => {
            if (!remaining) {
                r.push(...answers);
                return r;
            }
            answers.forEach((answer) => {
                const questionId = answer.questionId;
                if (Object.prototype.hasOwnProperty.call(remaining, questionId)) {
                    r.push(answer);
                }
            });
            return r;
        }, []);
        const group = options.group;
        if (group) {
            const groupComments = this.getGroupComments(group, userIndex, surveyIndex);
            const insertedComment = new Set();
            preresult = preresult.map((answer) => {
                const questionId = answer.questionId;
                const key = AnswerHistory.commentKey(userIndex, surveyIndex, questionId);
                const commentHistory = groupComments[key];
                if (commentHistory && commentHistory.length) {
                    insertedComment.add(questionId);
                    return Object.assign({ commentHistory }, answer);
                }
                return answer;
            });
            const key = AnswerHistory.key(userIndex, surveyIndex);
            const questionsWithComments = this.getGroupQuestionsWithComments(group, userIndex, surveyIndex);
            questionsWithComments.forEach((questionId) => {
                if (!insertedComment.has(questionId)) {
                    const commentKey = `${key}-${questionId}`;
                    const commentHistory = groupComments[commentKey];
                    const n = commentHistory && commentHistory.length;
                    if (n) {
                        const language = commentHistory[n - 1].language;
                        preresult.push({ questionId, language, commentHistory });
                    }
                }
            });
        }
        if (options.ignoreComments) {
            return preresult;
        }
        const insertedComment = new Set();
        const result = preresult.map((answer) => {
            const questionId = answer.questionId;
            const key = AnswerHistory.commentKey(userIndex, surveyIndex, questionId);
            const { comment } = this.comments[key] || {};
            if (comment) {
                insertedComment.add(questionId);
                return Object.assign({ comment }, answer);
            }
            return answer;
        });
        const key = AnswerHistory.key(userIndex, surveyIndex);
        const questionsWithComments = this.questionsWithComments[key];
        if (questionsWithComments) {
            questionsWithComments.forEach((questionId) => {
                if (!insertedComment.has(questionId)) {
                    const commentKey = `${key}-${questionId}`;
                    const { comment } = this.comments[commentKey] || {};
                    const language = comment.language;
                    result.push({ questionId, language, comment });
                }
            });
        }
        return result;
    }

    expectedRemovedAnswers(userIndex, surveyIndex) {
        const records = this.getAll(userIndex, surveyIndex);
        const result = records.reduce((r, { removed, answers }) => {
            answers.forEach((answer) => {
                const questionId = answer.questionId;
                const timeIndex = removed[questionId];
                if (timeIndex !== undefined) {
                    if (r[timeIndex] === undefined) {
                        r[timeIndex] = [];
                    }
                    r[timeIndex].push(answer);
                }
            });
            return r;
        }, {});
        return result;
    }

    copyAssessmentAnswers(userIndex, surveyIndex, prevAssessmentIndex) {
        const answers = this.expectedAnswers(prevAssessmentIndex, surveyIndex);
        const commentlessAnswers = answers.map(answer => _.omit(answer, 'comment'));
        this.push(userIndex, surveyIndex, commentlessAnswers);
    }
};
