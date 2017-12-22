'use strict';

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');

module.exports = class LinkDAO extends Base {
    createLink(userId, { url, displayType, field1, field2, sourceDate }) {
        return this.db.Link.create({ userId, url, displayType, field1, field2, sourceDate })
            .then(({ id }) => ({ id }));
    }

    getLink(userId, id) {
        const attributes = ['url', 'displayType', 'field1', 'field2', 'sourceDate'];
        return this.db.Link.findById(id, { raw: true, where: { userId }, attributes })
            .then((record) => {
                if (!record) {
                    return SurveyError.reject('linkNoSuchLink');
                }
                return record;
            });
    }

    listLinks(userId) {
        const attributes = ['id', 'url', 'displayType', 'field1', 'field2', 'sourceDate'];
        return this.db.Link.findAll({ raw: true, where: { userId }, attributes, order: 'id' });
    }
};
