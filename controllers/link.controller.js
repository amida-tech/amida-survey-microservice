'use strict';

const _ = require('lodash');

const shared = require('./shared.js');

exports.createLink = function createLink(req, res) {
    const userId = req.user.id;
    const url = _.get(req, 'swagger.params.url.value');
    const displayTypeId = _.get(req, 'swagger.params.displayTypeId.value');
    const field1 = _.get(req, 'swagger.params.field1.value');
    const field2 = _.get(req, 'swagger.params.field2.value');
    const sourceDate = _.get(req, 'swagger.params.sourceDate.value');
    const questionId = _.get(req, 'swagger.params.questionId.value');

    req.models.link.createLink(userId, { url,
        displayTypeId,
        field1,
        field2,
        sourceDate,
        questionId })
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(res));
};

exports.getLink = function getLink(req, res) {
    const userId = req.user.id;
    const id = _.get(req, 'swagger.params.id.value');
    req.models.link.getLink(userId, id)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};

exports.listLinks = function listLinks(req, res) {
    const userId = req.user.id;
    req.models.link.listLinks(userId)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};
