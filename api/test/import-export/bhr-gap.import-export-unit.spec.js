/* global before,describe,it,it*/
'use strict';
process.env.NODE_ENV = 'test';

const path = require('path');
const _ = require('lodash');
const chai = require('chai');

const models = require('../../models');

const SPromise = require('../../lib/promise');

const bhrGapImport = require('../../import/bhr-gap');
const bhrGapExport = require('../../export/bhr-gap');

const CSVConverterImport = require('../../import/csv-converter');

const SharedSpec = require('../util/shared-spec.js');

const comparator = require('../util/comparator');

const enumerations = require('../fixtures/import-export/bhr-gap/enumerations');
const surveys = require('../fixtures/import-export/bhr-gap/surveys');

const expect = chai.expect;

const shared = new SharedSpec();

describe('bhr gap import-export unit', function () {
    const fixtureDir = path.join(__dirname, '../fixtures/import-export/bhr-gap');
    const outputDir = path.join(__dirname, '../generated');

    const store = {
        surveyMap: null,
        answerIdentifierMap: null
    };

    before(shared.setUpFn());

    it('load all enumerations', function () {
        return models.enumeration.createEnumerations(enumerations)
            .then(() => models.enumeration.listEnumerations())
            .then(enumerations => {
                const promises = enumerations.map(({ id }) => models.enumeration.getEnumeration(id));
                return SPromise.all(promises).then(result => comparator.updateEnumerationMap(result));
            });
    });

    it('load all surveys', function () {
        return models.macro.createSurveys(surveys);
    });

    it('survey identifier map', function () {
        return models.surveyIdentifier.getIdsBySurveyIdentifier('bhr-unit-test')
            .then(map => store.surveyMap = map);
    });

    surveys.forEach(bhrSurvey => {
        it(`compare survey ${bhrSurvey.identifier.value}`, function () {
            const identifier = bhrSurvey.identifier.value;
            const surveyId = store.surveyMap.get(identifier);
            return models.survey.getSurvey(surveyId)
                .then(survey => {
                    const options = {
                        ignoreQuestionIdentifier: true,
                        ignoreSurveyIdentifier: true,
                        ignoreAnswerIdentifier: true
                    };
                    comparator.survey(bhrSurvey, survey, options);
                });
        });
    });

    it('import user profiles', function () {
        const filepath = path.join(fixtureDir, 'users.csv');
        return bhrGapImport.importSubjects(filepath, {
            surveyIdentifier: { type: 'bhr-unit-test', value: 'users' },
            questionIdentifierType: 'users-column',
            subjectCode: 'UserCode'
        });
    });

    it('export user profiles', function () {
        const filepath = path.join(outputDir, 'users-exported.csv');
        return bhrGapExport.writeSubjectsData(filepath, {
            order: 'UserCode',
            surveyIdentifier: {
                type: 'bhr-unit-test',
                value: 'users'
            },
            questionIdentifierType: 'users-column',
            subjectCode: 'UserCode'
        });
    });

    it('verify profiles', function () {
        const originalPath = path.join(fixtureDir, 'users.csv');
        const exportedPath = path.join(outputDir, 'users-exported.csv');
        const converter = new CSVConverterImport({ checkType: false, ignoreEmpty: true });
        return converter.fileToRecords(originalPath)
            .then(original => {
                return converter.fileToRecords(exportedPath)
                    .then(exported => {
                        const originalOrdered = _.sortBy(original, 'UserCode');
                        const exportedOrdered = _.sortBy(exported, 'UserCode');
                        exported.forEach(r => {
                            const races = r.RaceEthnicity.split(';').sort().join(';');
                            r.RaceEthnicity = races;
                        });
                        expect(exportedOrdered).to.deep.equal(originalOrdered);
                    });
            });
    });

    const transformTableDataFn = function (columIdentifier, filebase) {
        return function () {
            const filepath = path.join(fixtureDir, `${filebase}.csv`);
            const outputFilepath = path.join(outputDir, `${filebase}-trans.csv`);
            return bhrGapImport.transformSurveyFile(filepath, columIdentifier, outputFilepath);
        };
    };

    const importTableDataFn = function (tableIdentifier, filebase) {
        return function () {
            const transFile = path.join(outputDir, `${filebase}-trans.csv`);
            return bhrGapImport.importTransformedSurveyFile({ type: 'bhr-unit-test', value: tableIdentifier }, transFile);
        };
    };

    const exportTableDataFn = function (surveyType, answerType, filenamebase) {
        return function () {
            const filepath = path.join(outputDir, `${filenamebase}-exported.csv`);
            return bhrGapExport.writeTableData({ type: 'bhr-unit-test', value: surveyType }, answerType, filepath, ['SubjectCode', 'Timepoint']);
        };
    };

    const verifyTableDataFn = function (filenamebase) {
        return function () {
            const originalPath = path.join(fixtureDir, `${filenamebase}.csv`);
            const exportedPath = path.join(outputDir, `${filenamebase}-exported.csv`);
            const converter = new CSVConverterImport({ checkType: false, ignoreEmpty: true });
            return converter.fileToRecords(originalPath)
                .then(original => {
                    return converter.fileToRecords(exportedPath)
                        .then(exported => {
                            const originalOrdered = _.sortBy(original, ['SubjectCode', 'Timepoint', 'DaysAfterBaseline', 'Latest', 'Status']);
                            const exportedOrdered = _.sortBy(exported, ['SubjectCode', 'Timepoint', 'DaysAfterBaseline', 'Latest', 'Status']);
                            expect(exportedOrdered).to.deep.equal(originalOrdered);
                        });
                });
        };
    };

    const BHRGAPTable = (filebase, tableIdentifier, columIdentifier) => {
        it(`transform ${filebase}`, transformTableDataFn(columIdentifier, filebase));
        it(`import ${filebase}`, importTableDataFn(tableIdentifier, filebase));
        it(`export ${filebase}`, exportTableDataFn(tableIdentifier, columIdentifier, filebase));
        it(`verify ${filebase}`, verifyTableDataFn(filebase));
    };

    BHRGAPTable('sports', 'sports', 'sports-column');
    BHRGAPTable('television-history', 'television-history', 'television-column');
});
