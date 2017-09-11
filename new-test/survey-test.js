import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../index';

chai.config.includeStack = true;

describe('## Survey tests', () => {
    let newSurveyId;
    let newSurveyJson =
    `{
      "name":"new",
      "description":"new",
      "questions":
        [
          {"required":false,
          "text":"Question Title...",
          "type":"bool"}
        ],
          "status":"draft"
      }`

    describe('POST /surveys') => {
      it('should return 201 Created', (done) => {
        request(app)
          .post('/api/v1.0/surveys', newSurveyJson)
          .expect(httpStatus.Created)
          .then((res) => {
            .newSurveyId = res.body.id;
            done();
          }).catch(done);
      });
    }

});
