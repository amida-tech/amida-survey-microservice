/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs');
const chai = require('chai');
const _ = require('lodash');
const mkdirp = require('mkdirp');

const config = require('../../config');

const SharedIntegration = require('../util/shared-integration');
const RRSuperTest = require('../util/rr-super-test');
const Generator = require('../util/generator');
const History = require('../util/history');
const questionCommon = require('../util/question-common');

const expect = chai.expect;
const generator = new Generator();
const shared = new SharedIntegration(generator);

describe('question integration unit', function () {
    const rrSuperTest = new RRSuperTest();
    const hxQuestion = new History();
    const tests = new questionCommon.IntegrationTests(rrSuperTest, generator, hxQuestion);

    before(shared.setUpFn(rrSuperTest));

    it('login as super', shared.loginFn(rrSuperTest, config.superUser));

    for (let i = 0; i < 12; ++i) {
        it(`create question ${i}`, tests.createQuestionFn());
        it(`get question ${i}`, tests.getQuestionFn(i));
    }

    it('list all questions', tests.listQuestionsFn('export'));

    _.forEach([1, 6, 10], index => {
        it(`delete question ${index}`, tests.deleteQuestionFn(index));
    });

    it('list all questions (export)', tests.listQuestionsFn('export'));

    for (let i = 12; i < 24; ++i) {
        it(`create question ${i}`, tests.createQuestionFn());
        it(`get question ${i}`, tests.getQuestionFn(i));
    }

    _.forEach([4, 17], index => {
        it(`delete question ${index}`, tests.deleteQuestionFn(index));
    });

    it('list all questions (export)', tests.listQuestionsFn('export'));

    const generatedDirectory = path.join(__dirname, '../generated');

    it('create output directory if necessary', function (done) {
        mkdirp(generatedDirectory, done);
    });

    it('export questions to csv', function (done) {
        rrSuperTest.get('/questions/csv', true, 200)
            .expect(function (res) {
                const filepath = path.join(generatedDirectory, 'question.csv');
                fs.writeFileSync(filepath, res.text);
            })
            .end(done);
    });

    it('reset database', shared.setUpFn(rrSuperTest));

    let idMap;

    it('import csv into db', function (done) {
        const filepath = path.join(generatedDirectory, 'question.csv');
        rrSuperTest.postFile('/questions/csv', 'questioncsv', filepath, null, 201)
            .expect(function (res) {
                idMap = res.body;
            })
            .end(done);
    });

    it('list imported questions and verify', function () {
        const query = { scope: 'export' };
        return function (done) {
            rrSuperTest.get('/questions', true, 200, query)
                .expect(function (res) {
                    const fields = questionCommon.getFieldsForList('export');
                    const expected = hxQuestion.listServers(fields);
                    questionCommon.updateIds(expected, idMap);
                    expect(res.body).to.deep.equal(expected);
                })
                .end(done);
        };
    });
});
