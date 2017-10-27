/* global describe,before,it */

'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const SharedIntegration = require('./util/shared-integration.js');
const SurveySuperTest = require('./util/survey-super-test');

describe('health check unit', () => {

    const surveySuperTest = new SurveySuperTest();
    const shared = new SharedIntegration(surveySuperTest);
    before(shared.setUpFn());


    it('confirm health-check',(done) => {
        surveySuperTest.get('/health-check',false,200).end(done);
    })
})
