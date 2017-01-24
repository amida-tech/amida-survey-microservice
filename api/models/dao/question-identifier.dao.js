'use strict';

const db = require('../db');
const RRError = require('../../lib/rr-error');

const QuestionIdentifier = db.QuestionIdentifier;
const Question = db.Question;

module.exports = class QuestionIdentifierDAO {
    constructor() {}

    createQuestionIdentifier(questionIdentifier, transaction) {
        return QuestionIdentifier.create(questionIdentifier, { transaction })
            .then(({ id }) => ({ id }));
    }

    getQuestionIdByIdentifier(type, identifier) {
        return QuestionIdentifier.findOne({
                where: { type, identifier },
                attributes: ['questionId'],
                raw: true
            })
            .then(ids => {
                if (!ids) {
                    return RRError.reject('questionIdentifierNotFound');
                }
                return ids;
            });
    }

    getInformationByQuestionIdentifier(type) {
        return QuestionIdentifier.findAll({
                where: { type },
                attributes: ['questionId', 'identifier'],
                include: [{ model: Question, as: 'question', attributes: ['id', 'type'] }],
                raw: true
            })
            .then(records => {
                const map = records.map(record => [record.identifier, {
                    id: record['question.id'],
                    type: record['question.type']
                }]);
                return new Map(map);
            });
    }

    getQuestionIdToIdentifierMap(type, ids) {
        const options = {
            where: { type },
            attributes: ['identifier', 'questionId'],
            raw: true
        };
        if (ids) {
            options.where.questionId = { $in: ids };
        }
        return QuestionIdentifier.findAll(options)
            .then(records => {
                return records.reduce((r, record) => {
                    r[record.questionId] = record.identifier;
                    return r;
                }, {});
            });
    }
};
