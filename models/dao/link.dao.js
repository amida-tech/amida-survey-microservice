'use strict';

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');

module.exports = class LinkDAO extends Base {
    createLink(userId, { url, displayTypeId, field1, field2, sourceDate, questionId }) {
        return this.db.Link.create({ userId,
            url,
            displayTypeId,
            field1,
            field2,
            sourceDate,
            questionId })
            .then(({ id }) => ({ id }));
    }

    getLink(userId, id) {
        const attributes = ['url', 'displayTypeId', 'field1', 'field2', 'sourceDate', 'questionId'];
        return this.db.Link.findById(id, { raw: true, where: { userId }, attributes })
            .then((record) => {
                if (!record) {
                    return SurveyError.reject('linkNoSuchLink');
                }
                return record;
            });
    }

    listLinks(userId) {
        const attributes = ['id', 'url', 'displayTypeId', 'field1', 'field2', 'sourceDate', 'questionId'];
        return this.db.Link.findAll({ raw: true, where: { userId }, attributes, order: 'id' });
    }
};
