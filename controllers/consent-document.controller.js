'use strict';

const _ = require('lodash');

const models = require('../models');
const shared = require('./shared.js');

const consentDocument = models.consentDocument;

exports.createConsentDocument = function (req, res) {
    consentDocument.createConsentDocument(req.body)
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(res));
};

exports.getConsentDocument = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    const language = _.get(req, 'swagger.params.language.value');
    consentDocument.getConsentDocument(id, { language })
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};

exports.getConsentDocumentByTypeName = function (req, res) {
    const typeName = _.get(req, 'swagger.params.typeName.value');
    const language = _.get(req, 'swagger.params.language.value');
    consentDocument.getConsentDocumentByTypeName(typeName, { language })
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};

exports.updateConsentDocumentText = function (req, res) {
    const language = _.get(req, 'swagger.params.language.value');
    consentDocument.updateConsentDocumentText(req.body, language)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.getUpdateCommentHistory = function (req, res) {
    const typeId = _.get(req, 'swagger.params.typeId.value');
    const language = _.get(req, 'swagger.params.language.value');
    consentDocument.getUpdateCommentHistory(typeId, language)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};