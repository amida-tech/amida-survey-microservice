'use strict';

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');

module.exports = class QuestionIdentifierDAO extends Base {
    createQuestionIdentifier(questionIdentifier, transaction) {
        return this.db.QuestionIdentifier.create(questionIdentifier, { transaction })
            .then(({ id }) => ({ id }));
    }

    getQuestionIdByIdentifier(type, identifier) {
        return this.db.QuestionIdentifier.findOne({
            where: { type, identifier },
            attributes: ['questionId'],
            raw: true,
        })
            .then((ids) => {
                if (!ids) {
                    return SurveyError.reject('questionIdentifierNotFound');
                }
                return ids;
            });
    }

    getInformationByQuestionIdentifier(type) {
        const Question = this.db.Question;
        return this.db.QuestionIdentifier.findAll({
            where: { type },
            attributes: ['questionId', 'identifier'],
            include: [{ model: Question, as: 'question', attributes: ['id', 'type'] }],
            raw: true,
        })
            .then((records) => {
                const map = records.map(record => [record.identifier, {
                    id: record['question.id'],
                    type: record['question.type'],
                }]);
                return new Map(map);
            });
    }

    getInformationByQuestionId(type, ids) {
        const Question = this.db.Question;
        const options = {
            where: { type },
            attributes: ['identifier', 'questionId'],
            include: [{ model: Question, as: 'question', attributes: ['type'] }],
            raw: true,
        };
        if (ids) {
            options.where.questionId = { $in: ids };
        }
        return this.db.QuestionIdentifier.findAll(options)
            .then(records => records.reduce((r, record) => {
                r[record.questionId] = {
                    identifier: record.identifier,
                    type: record['question.type'],
                };
                return r;
            }, {}));
    }
};
