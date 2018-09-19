/* global describe,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const _ = require('lodash');

const config = require('../../config');

const SharedIntegration = require('../util/shared-integration');
const SurveySuperTest = require('../util/survey-super-test');
const Generator = require('../util/generator');
const MultiQuestionGenerator = require('../util/generator/multi-question-generator');
const History = require('../util/history');
const questionCommon = require('../util/question-common');

describe('tenant single schema public', function tenantPublic() {
    const surveySuperTest = new SurveySuperTest();
    const generator = new Generator();
    const shared = new SharedIntegration(surveySuperTest, generator);

    const options = { generatedb: true };

    it('setup database', shared.setUpFn(options));

    it('login as super', shared.loginFn(config.superUser));

    const hxQuestion = new History();
    const tests = new questionCommon.IntegrationTests(surveySuperTest, { generator, hxQuestion });

    _.range(3).forEach((index) => {
        it(`create question ${index}`, tests.createQuestionFn());
        it(`get question ${index}`, tests.getQuestionFn(index));
    });

    it('list questions (complete)', tests.listQuestionsFn('complete'));

    it('replace generator to multiple question generator', () => {
        const multiGenerator = new MultiQuestionGenerator(generator.questionGenerator);
        generator.questionGenerator = multiGenerator;
    });

    _.range(3, 4).forEach((index) => {
        it(`create question ${index}`, tests.createQuestionFn());
        it(`get question ${index}`, tests.getQuestionFn(index));
    });

    it('list questions (complete)', tests.listQuestionsFn('complete'));

    it('logout as super', shared.logoutFn());

    it('close connections', function closeSequelize() {
        return surveySuperTest.shutDown();
    });
});
