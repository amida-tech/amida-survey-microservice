'use strict';

const _ = require('lodash');
const intoStream = require('into-stream');

const shared = require('./shared.js');

exports.createAssessment = function createAssessment(req, res) {
    req.models.assessment.createAssessment(req.body)
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(res));
};

exports.getAssessment = function getAssessment(req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    req.models.assessment.getAssessment(id)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};

exports.deleteAssessment = function deleteAssessment(req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    req.models.assessment.deleteAssessment(id)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.listAssessments = function listAssessments(req, res) {
    const group = _.get(req, 'swagger.params.group.value');
    const options = group ? { group } : {};
    req.models.assessment.listAssessments(options)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};

exports.exportAssessmentscsv = function exportAssessmentscsv(req, res) {
    const surveyId = _.get(req, 'swagger.params.survey-id.value');
    const group = _.get(req, 'swagger.params.group.value');
    const userId = req.user.id;
    const options = { userId, group, surveyId };

    req.models.assessment.exportAssessmentscsv(options)
        .then((result) => {
            res.type('text/csv');
            res.status(200).send(result);
        })
        .catch(shared.handleError(res));
};

exports.importAssessments = function importAssessments(req, res) {
    const csvFile = _.get(req, 'swagger.params.assessmentscsv.value');
    const stream = intoStream(csvFile.buffer);
    req.models.assessment.importAssessments(stream, { })
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(res));
};
