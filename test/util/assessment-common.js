'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const chai = require('chai');

const models = require('../../models');

const expect = chai.expect;

const SpecTests = class AssessmentSpecTests {
    constructor(generator, hxSurvey, hxAssessment) {
        this.generator = generator;
        this.hxSurvey = hxSurvey;
        this.hxAssessment = hxAssessment;
    }

    createAssessmentFn(indices) {
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxAssessment = this.hxAssessment;
        return function createAssessmen() {
            const surveyIds = indices.map(index => hxSurvey.id(index));
            const assessment = generator.newAssessment(surveyIds);
            return models.assessment.createAssessment(assessment)
                .then(({ id }) => hxAssessment.pushWithId(assessment, id));
        };
    }

    getAssessmentFn(index) {
        const hxAssessment = this.hxAssessment;
        return function getAssessment() {
            const id = hxAssessment.id(index);
            return models.assessment.getAssessment(id)
                .then((assessment) => {
                    expect(assessment).to.deep.equal(hxAssessment.server(index));
                });
        };
    }

    listAssessmentFn() {
        const hxAssessment = this.hxAssessment;
        return function listAssessment() {
            return models.assessment.listAssessments()
                .then((list) => {
                    expect(list).to.deep.equal(hxAssessment.listServers());
                });
        };
    }
};

const IntegrationTests = class AssessmentSpecTests {
    constructor(surveySuperTest, generator, hxSurvey, hxAssessment) {
        this.surveySuperTest = surveySuperTest;
        this.generator = generator;
        this.hxSurvey = hxSurvey;
        this.hxAssessment = hxAssessment;
    }

    createAssessmentFn(indices) {
        const surveySuperTest = this.surveySuperTest;
        const generator = this.generator;
        const hxSurvey = this.hxSurvey;
        const hxAssessment = this.hxAssessment;
        return function createAssessment(done) {
            const surveyIds = indices.map(index => hxSurvey.id(index));
            const assessment = generator.newAssessment(surveyIds);
            surveySuperTest.post('/assessments', assessment, 201)
                .expect((res) => {
                    hxAssessment.pushWithId(assessment, res.body.id);
                })
                .end(done);
        };
    }

    getAssessmentFn(index) {
        const surveySuperTest = this.surveySuperTest;
        const hxAssessment = this.hxAssessment;
        return function getAssessment(done) {
            const id = hxAssessment.id(index);
            surveySuperTest.get(`/assessments/${id}`, true, 200)
                .expect((res) => {
                    expect(res.body).to.deep.equal(hxAssessment.server(index));
                })
                .end(done);
        };
    }

    listAssessmentFn() {
        const surveySuperTest = this.surveySuperTest;
        const hxAssessment = this.hxAssessment;
        return function listAssessment(done) {
            surveySuperTest.get('/assessments', true, 200)
                .expect((res) => {
                    expect(res.body).to.deep.equal(hxAssessment.listServers());
                })
                .end(done);
        };
    }
};

module.exports = {
    SpecTests,
    IntegrationTests,
};
