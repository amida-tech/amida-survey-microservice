'use strict';

const _ = require('lodash');

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

exports.exportAssessmentAnswers = function exportAssessmentAnswers(req, res) {
    const surveyId = _.get(req, 'swagger.params.survey-id.value');
    const questionId = _.get(req, 'swagger.params.question-id.value');
    const includeComments = _.get(req, 'swagger.params.include-comments.value');
    const sectionId = _.get(req, 'swagger.params.section-id.value');
    //TODO:    const userIds = _.get(req, 'swagger.params.user-id.value');
    //TODO: const group = _.get(req, 'swagger.params.group.value')
    const options = { surveyId, sectionId, questionId, includeComments };
    req.models.assessmentAnswer.exportAssessmentAnswers(options)
        .then(result => res.status(200).send(result))
        .catch(shared.handleError(res));
};

exports.assessmentAnswersCSV = function assessmentAnswersCSV(req, res) {
    const surveyId = _.get(req, 'swagger.params.survey-id.value');
    const questionId = _.get(req, 'swagger.params.question-id.value');
    const sectionId = _.get(req, 'swagger.params.section-id.value');
   //TODO:    const userIds = _.get(req, 'swagger.params.user-id.value');
   //TODO: const group = _.get(req, 'swagger.params.group.value')
    const options = { surveyId, sectionId, questionId };

    req.models.assessmentAnswer.exportAssessmentAnswersCSV(options)
        .then((result) => {
            res.type('text/csv');
            res.header('Content-disposition', 'attachment; filename=answer.csv');
            res.status(200).send(result);
        })
        .catch(shared.handleError(res));
};

exports.importAssessmentAnswers = function importAnswers(req, res) {
    const userId = req.user.id;
    const csvFile = _.get(req, 'swagger.params.answercsv.value');
    const assessmentIdMapAsString = _.get(req, 'swagger.params.questionidmap.value');
    const questionIdMapAsString = _.get(req, 'swagger.params.questionidmap.value');
    const surveyIdMapAsString = _.get(req, 'swagger.params.surveyidmap.value');
    const userIdMapAsString = _.get(req, 'swagger.params.useridmap.value');
    const assessmentIdMap = JSON.parse(assessmentIdMapAsString);
    const questionIdMap = JSON.parse(questionIdMapAsString);
    const surveyIdMap = JSON.parse(surveyIdMapAsString);
    const userIdMap = JSON.parse(userIdMapAsString);
    const stream = intoStream(csvFile.buffer);
    const maps = {surveyIdMap, questionIdMap, assessmentIdMap}
    if(userIdMap) {
        maps.userIdMap = userIdMap;
    } else {
        maps.userId = userId;
    }

    req.models.assessmentAnswer.importAnswers(stream, maps)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};
