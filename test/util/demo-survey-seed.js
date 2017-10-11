'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

/* eslint no-console: 0 */

const models = require('../../models');
const SPromise = require('../../lib/promise');

module.exports = function demoSurveySeed(example, inputModels) {
    const m = inputModels || models;
    const demoSurveyPxs = example.demoSurveys.map(survey => m.survey.createSurvey(survey));
    return SPromise.all(demoSurveyPxs)
    .then(() => {
        console.log('demo surveys added!');
    });
};
