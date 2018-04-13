'use strict';

const _ = require('lodash');
const intoStream = require('into-stream');

const shared = require('./shared.js');

exports.createAssessmentAnswers = function createAssessmentAnswers(req, res) {
    const answers = req.body;
    const assessmentId = _.get(req, 'swagger.params.id.value');
    answers.userId = req.user.id;
    answers.assessmentId = assessmentId;
    req.models.assessmentAnswer.createAssessmentAnswers(answers)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.getAssessmentAnswers = function getAssessmentAnswers(req, res) {
    const assessmentId = _.get(req, 'swagger.params.id.value');
    const userId = req.user.id;
    req.models.assessmentAnswer.getAssessmentAnswers({ userId, assessmentId })
        .then(answers => res.status(200).json(answers))
        .catch(shared.handleError(res));
};

exports.getAssessmentAnswersOnly = function getAssessmentAnswersOnly(req, res) {
    const assessmentId = _.get(req, 'swagger.params.id.value');
    const userId = req.user.id;
    req.models.assessmentAnswer.getAssessmentAnswersOnly({ userId, assessmentId })
        .then(answers => res.status(200).json(answers))
        .catch(shared.handleError(res));
};

exports.getAssessmentAnswersStatus = function getAssessmentAnswersStatus(req, res) {
    const assessmentId = _.get(req, 'swagger.params.id.value');
    req.models.assessmentAnswer.getAssessmentAnswersStatus({ assessmentId })
        .then(status => res.status(200).json({ status }))
        .catch(shared.handleError(res));
};

exports.getAssessmentAnswersList = function getAssessmentAnswersStatus(req, res) {
    const group = _.get(req, 'swagger.params.group.value');
    const assessmentAnswersStatus = _.get(req, 'swagger.params.assessment-answers-status.value');
    const options = { group, assessmentAnswersStatus };
    req.models.assessmentAnswer.getAssessmentAnswersList(options)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};

exports.copyAssessmentAnswers = function copyAssessmentAnswers(req, res) {
    const input = req.body;
    const assessmentId = _.get(req, 'swagger.params.id.value');
    input.userId = req.user.id;
    input.assessmentId = assessmentId;
    req.models.assessmentAnswer.copyAssessmentAnswers(input)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.exportAssessmentAnswerAnswers = function exportAssessmentAnswerAnswers(req, res) {
    const surveyId = _.get(req, 'swagger.params.survey-id.value');
    const questionId = _.get(req, 'swagger.params.question-id.value');
    const includeComments = _.get(req, 'swagger.params.include-comments.value');
    const sectionId = _.get(req, 'swagger.params.section-id.value');
// TODO:    const userIds = _.get(req, 'swagger.params.user-id.value');
    const options = { surveyId, sectionId, questionId, includeComments };
    req.models.assessmentAnswer.exportAssessmentAnswerAnswers(options)
        .then(result => res.status(200).send(result))
        .catch(shared.handleError(res));
};

exports.assessmentAnswerAnswersCSV = function assessmentAnswerAnswersCSV(req, res) {
    const surveyId = _.get(req, 'swagger.params.survey-id.value');
    const questionId = _.get(req, 'swagger.params.question-id.value');
    const sectionId = _.get(req, 'swagger.params.section-id.value');
// TODO:    const userIds = _.get(req, 'swagger.params.user-id.value');
    const options = { surveyId, sectionId, questionId };

    req.models.assessmentAnswer.exportAssessmentAnswerAnswersCSV(options)
        .then((result) => {
            res.type('text/csv');
            res.status(200).send(result);
        })
        .catch(shared.handleError(res));
};

exports.exportAssessmentAnswerAnswers = function exportAssessmentAnswerAnswers(req,res) {
    req.models.assessmentAnswer.exportAssessmentAnswerAnswers()
        .then(result => res.status(200).send(result))
        .catch(shared.handleError(res));
}

exports.importAssessmentAnswerAnswers = function importAssessmentAnswerAnswers(req, res) {
    const csvFile = _.get(req, 'swagger.param.statuscsv.value');
    const assessmentIdMapAsString = _.get(req, 'swagger.params.assessmentIdMap.value');
    const assessmentIdMap = JSON.parse(assessmentIdMapAsString);
    const stream = intoStream(csvFile.buffer);
    req.models.assessmentAnswer.importAssessmentAnswers(stream, {assessmentIdMap})
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(res));
}

exports.exportAssessmentAnswerscsv = function exportAssessmentAnswers(req,res) {
    const group = _.get(req, 'swagger.params.group.value');
    const assessmentAnswersStatus = _.get(req, 'swagger.params.assessment-answers-status.value');
    const options = { group, assessmentAnswersStatus };
    req.models.assessmentAnswer.exportAssessmentAnswersCSV(options)
        .then((result) => {
            res.type('text/csv');
            res.status(200).send(result);
        })
        .catch(shared.handleError(res));
}
