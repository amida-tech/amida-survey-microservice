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
            .then(records => records.map(record => _.omitBy(record, _.isNil)))
            .then(records => records.reduce((r, record) => {
                const questionId = record.questionId;
                const comment = _.omit(record, 'questionId');
                r.push({ questionId, comment });
                return r;
            }, []));
    }
};
