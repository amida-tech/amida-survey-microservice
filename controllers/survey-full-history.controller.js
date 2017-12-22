'use strict';

const _ = require('lodash');

const shared = require('./shared.js');

exports.getUserSurveyAnswers = function getUserSurveyAnswers(req, res) {
    const userId = req.user.id;
    const surveyId = _.get(req, 'swagger.params.id.value');
    const options = {
        language: _.get(req, 'swagger.params.language.value'),
        includeSurvey: _.get(req, 'swagger.params.include-survey.value'),
    };
    req.models.userSurvey.getUserSurveyAnswers(userId, surveyId, options)
        .then(result => res.status(200).json(result))
.catch(shared.handleError(res));
};