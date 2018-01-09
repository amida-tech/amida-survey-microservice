'use strict';

const _ = require('lodash');

const Base = require('./base');

module.exports = class AnswerCommentDAO extends Base {
    createAnswerCommentsTx(commonFields, comments, transaction) {
        const records = comments.map(({ questionId, comment }) => {
            const record = Object.assign({ questionId }, commonFields);
            record.language = record.language || 'en';
            return Object.assign(record, comment);
        });
        return this.db.AnswerComment.bulkCreate(records, { transaction });
    }

    listAnswerComments({ assessmentId, assessmentIds }) {
        const attributes = ['id', 'userId', 'questionId', 'reason', 'text', 'language'];
        const where = {};
        if (assessmentId) {
            where.assessmentId = assessmentId;
        }
        if (assessmentIds) {
            attributes.push('assessmentId');
            where.assessmentId = { $in: assessmentIds };
        }
        const order = ['created_at'];
        return this.db.AnswerComment.findAll({ where, attributes, raw: true, order })
            .then(records => records.map(record => _.omitBy(record, _.isNil)))
            .then(records => records.reduce((r, record) => {
                const questionId = record.questionId;
                const comment = _.omit(record, ['questionId', 'assessmentId']);
                const commentObj = { questionId, comment };
                if (record.assessmentId) {
                    commentObj.assessmentId = record.assessmentId;
                }
                r.push(commentObj);
                return r;
            }, []));
    }

    listAnswerCommentsWithHistory({ assessmentId }) {
        return this.db.Assessment.findById(assessmentId, {
            raw: true, attributes: ['group'],
        })
            .then(({ group }) => {
                if (!group) {
                    return [assessmentId];
                }
                return this.db.Assessment.findAll({
                    raw: true, attributes: ['id'], where: { group },
                })
                    .then(groupResult => groupResult.map(({ id }) => id));
            })
            .then(assessmentIds => this.listAnswerComments({ assessmentIds }))
            .then((records) => {
                const answerMap = {};
                return records.reduce((r, record) => {
                    const { questionId, comment } = record;
                    let answer = answerMap[questionId];
                    if (!answer) {
                        answer = { questionId };
                        answerMap[questionId] = answer;
                        r.push(answer);
                    }
                    if (record.assessmentId === assessmentId) {
                        answer.comment = comment;
                        return r;
                    }
                    if (!answer.commentHistory) {
                        answer.commentHistory = [comment];
                        return r;
                    }
                    answer.commentHistory.push(comment);
                    return r;
                }, []);
            });
    }
};
