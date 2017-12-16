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

    listAnswerComments({ assessmentId }) {
        const attributes = ['id', 'userId', 'questionId', 'reason', 'text', 'language'];
        const where = { assessmentId };
        return this.db.AnswerComment.findAll({ where, attributes, raw: true })
            .then((records) => {
                const { result } = records.reduce((r, record) => {
                    const questionId = record.questionId;
                    let comments = r.map[questionId];
                    if (!comments) {
                        comments = [];
                        r.result.push({ questionId, comments });
                        r.map[questionId] = comments;
                    }
                    comments.push(_.omit(record, 'questionId'));
                    return r;
                }, { result: [], map: {} });
                return result;
            });
    }
};
