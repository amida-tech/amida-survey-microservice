/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs');
const chai = require('chai');
const _ = require('lodash');
const mkdirp = require('mkdirp');

const config = require('../../config');

const SharedIntegration = require('../util/shared-integration');
const SurveySuperTest = require('../util/survey-super-test');
const Generator = require('../util/generator');
const SurveyHistory = require('../util/survey-history');
const surveyCommon = require('../util/survey-common');

const expect = chai.expect;

describe('survey import-export integration', function surveyImportExportIntegration() {
    const surveySuperTest = new SurveySuperTest();
    const generator = new Generator();
    const shared = new SharedIntegration(surveySuperTest, generator);
    const hxSurvey = new SurveyHistory();
    const tests = new surveyCommon.IntegrationTests(surveySuperTest, generator, hxSurvey);

    before(shared.setUpFn());

    it('login as super', shared.loginFn(config.superUser));

    _.range(8).forEach((index) => {
        it(`create survey ${index}`, tests.createSurveyFn({ noSection: true }));
        it(`get survey ${index}`, tests.getSurveyFn(index));
    });

    [2, 6].forEach((index) => {
        it(`delete survey ${index}`, tests.deleteSurveyFn(index));
    });

    it('list all surveys (export)', tests.listSurveysFn({ scope: 'export' }));

    _.range(8, 14).forEach((index) => {
        it(`create survey ${index}`, tests.createSurveyFn({ noSection: true }));
        it(`get survey ${index}`, tests.getSurveyFn(index));
    });

    [3, 11].forEach((index) => {
        it(`delete survey ${index}`, tests.deleteSurveyFn(index));
    });

    it('list all surveys (export)', tests.listSurveysFn({ scope: 'export' }));

    const generatedDirectory = path.join(__dirname, '../generated');

    it('create output directory if necessary', function createOutDirectory(done) {
        mkdirp(generatedDirectory, done);
    });

    it('export questions to csv', function exportQuestionsToCSV() {
        return surveySuperTest.get('/questions/csv', true, 200)
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'question.csv');
                fs.writeFileSync(filepath, res.text);
            });
    });

    it('export surveys to csv', function exportSurveysToCSV() {
        return surveySuperTest.get('/surveys/csv', true, 200)
            .expect((res) => {
                const filepath = path.join(generatedDirectory, 'survey.csv');
                fs.writeFileSync(filepath, res.text);
            });
    });

    it('reset database', shared.setUpFn());

    it('login as super', shared.loginFn(config.superUser));

    let questionIdMap;

    it('import question csv into db', function importQuestionsFromCSV() {
        const filepath = path.join(generatedDirectory, 'question.csv');
        return surveySuperTest.postFile('/questions/csv', 'questioncsv', filepath, null, 201)
            .expect((res) => {
                questionIdMap = res.body;
            });
    });

    let idMap;

    it('import survey csv into db', function importSurveysFromCSV() {
        const filepath = path.join(generatedDirectory, 'survey.csv');
        const questionidmap = JSON.stringify(questionIdMap);
        return surveySuperTest.postFile('/surveys/csv', 'surveycsv', filepath, { questionidmap }, 201)
            .expect((res) => {
                idMap = res.body;
            });
    });

    it('list imported surveys and verify', function listImportedAndVerify() {
        const query = { scope: 'export' };

        return surveySuperTest.get('/surveys', true, 200, query)
            .expect((res) => {
                const expected = hxSurvey.listServersByScope({ scope: 'export' });
                surveyCommon.updateIds(expected, idMap, questionIdMap);
                expect(res.body).to.deep.equal(expected);
            });
    });
});
