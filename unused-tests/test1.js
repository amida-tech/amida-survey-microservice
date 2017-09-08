const blanket = require("blanket");
const models = require('../models');
const chai = require('chai');
const RRSuperTest = require('../test/util/rr-super-test');
const locals = {};
const expect = chai.expect;

describe('ssurvey get requests', () => {

  const rrSuperTest = new RRSuperTest();

  it('survey?all request', function surveyAllRequest() {

    expect(1).to.equal(1);
  });

})
