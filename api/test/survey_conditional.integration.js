/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const config = require('../config');

const Answerer = require('./util/generator/answerer');
const RRSuperTest = require('./util/rr-super-test');
const QuestionGenerator = require('./util/generator/question-generator');
const SurveyGenerator = require('./util/generator/survey-generator');
const Generator = require('./util/generator');
const SurveyHistory = require('./util/survey-history');
const SharedIntegration = require('./util/shared-integration');
const surveyCommon = require('./util/survey-common');

const ConditionalSurveyGenerator = (function () {
    const conditionalQuestions = {
        '0-3': { type: 'choice', logic: 'equals', count: 3 },
        '1-5': { type: 'choice', logic: 'equals', count: 1 },
        '2-3': { type: 'bool', logic: 'equals', count: 2 },
        '3-0': { type: 'text', logic: 'exists', count: 1 },
        '4-2': { type: 'choices', logic: 'equals', count: 2 }
    };

    const requiredOverrides = {
        '0-3': false,
        '1-5': true,
        '1-6': true,
        '2-3': true,
        '2-4': true,
        '2-5': true,
        '3-0': true,
        '3-1': true,
        '4-2': false,
        '4-3': true,
        '4-4': true
    };

    return class ConditionalSurveyGenerator extends SurveyGenerator {
        constructor(conditionalQuestionGenerator, answerer) {
            super(conditionalQuestionGenerator);
            this.answerer = answerer;
        }

        sectionType() {
            return 0;
        }

        count() {
            return 8;
        }

        newSurveyQuestion(index) {
            const surveyIndex = this.currentIndex();
            const key = `${surveyIndex}-${index}`;
            const questionInfo = conditionalQuestions[key];
            let question;
            if (questionInfo) {
                const { type, logic, count } = questionInfo;
                const skip = { rule: { logic }, count };
                question = this.questionGenerator.newQuestion(type);
                if (logic === 'equals') {
                    skip.rule.answer = this.answerer.answerRawQuestion(question);
                }
                question.skip = skip;
            } else {
                question = super.newSurveyQuestion(index);
            }
            const requiredOverride = requiredOverrides[key];
            if (requiredOverride !== undefined) {
                question.required = requiredOverride;
            }
            return question;
        }
    };
})();

const answerer = new Answerer();
const questionGenerator = new QuestionGenerator();
const surveyGenerator = new ConditionalSurveyGenerator(questionGenerator, answerer);
const generator = new Generator({ surveyGenerator, questionGenerator, answerer });
const shared = new SharedIntegration(generator);

describe('survey (conditional questions) integration', function () {
    let surveyCount = 5;

    const rrSuperTest = new RRSuperTest();
    const hxSurvey = new SurveyHistory();
    const tests = new surveyCommon.IntegrationTests(rrSuperTest, generator, hxSurvey);

    before(shared.setUpFn(rrSuperTest));

    it('login as super', shared.loginFn(rrSuperTest, config.superUser));

    for (let i = 0; i < surveyCount; ++i) {
        it(`create survey ${i}`, tests.createSurveyFn());
        it(`get survey ${i}`, tests.getSurveyFn(i));
    }

    it('logout as super', shared.logoutFn(rrSuperTest));
});
