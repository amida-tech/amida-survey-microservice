'use strict';

const UserDAO = require('./user.dao');
const QuestionChoiceDAO = require('./question-choice.dao');
const QuestionDAO = require('./question.dao');
const AnswerDAO = require('./answer.dao');
const SurveyDAO = require('./survey.dao');
const SurveyQuestionDAO = require('./survey-question.dao');
const LanguageDAO = require('./language.dao');
const SectionDAO = require('./section.dao');
const SurveySectionQuestionDAO = require('./survey-section-question.dao');
const SurveySectionDAO = require('./survey-section.dao');
const UserSurveyDAO = require('./user-survey.dao');
const AssessmentDAO = require('./assessment.dao');
const UserAssessmentDAO = require('./user-assessment.dao');
const QuestionIdentifierDAO = require('./question-identifier.dao');
const AnswerIdentifierDAO = require('./answer-identifier.dao');
const AnswerRuleDAO = require('./answer-rule.dao');
const SurveyIdentifierDAO = require('./survey-identifier.dao');
const ChoiceSetDAO = require('./choice-set.dao');
const UserAuditDAO = require('./user-audit.dao');
const FilterDAO = require('./filter.dao');
const FilterAnswerDAO = require('./filter-answer.dao');
const FileDAO = require('./file.dao');
const AnswerCommentDAO = require('./answer-comment.dao');
const AssessmentAnswerDAO = require('./assessment-answer.dao');

const doasPerSchema = function (db, daosGenerator) {
    const questionIdentifier = new QuestionIdentifierDAO(db);
    const answerIdentifier = new AnswerIdentifierDAO(db);
    const surveyIdentifier = new SurveyIdentifierDAO(db);
    const user = new UserDAO(db, {});
    const section = new SectionDAO(db);
    const surveySectionQuestion = new SurveySectionQuestionDAO(db);
    const surveySection = new SurveySectionDAO(db, { section, surveySectionQuestion });
    const questionChoice = new QuestionChoiceDAO(db);
    const choiceSet = new ChoiceSetDAO(db, { questionChoice });
    const question = new QuestionDAO(db, {
        questionChoice, choiceSet, questionIdentifier, answerIdentifier,
    });
    const surveyQuestion = new SurveyQuestionDAO(db);
    const answerRule = new AnswerRuleDAO(db);
    const answer = new AnswerDAO(db, {
        surveyQuestion, surveySection, answerRule, generator: daosGenerator,
    });
    const survey = new SurveyDAO(db, {
        answer,
        answerRule,
        surveySection,
        question,
        questionChoice,
        surveyIdentifier,
        surveyQuestion,
    });
    const userSurvey = new UserSurveyDAO(db, { survey, answer });
    const language = new LanguageDAO(db);
    const assessment = new AssessmentDAO(db);
    const userAssessment = new UserAssessmentDAO(db, { answer });
    const userAudit = new UserAuditDAO(db);
    const filterAnswer = new FilterAnswerDAO(db);
    const filter = new FilterDAO(db, { filterAnswer });
    const file = new FileDAO(db);
    const answerComment = new AnswerCommentDAO(db);
    const assessmentAnswer = new AssessmentAnswerDAO(db, { answer, answerComment, assessment });

    return {
        sequelize: db.sequelize,
        user,
        section,
        surveySection,
        questionChoice,
        question,
        answer,
        survey,
        userSurvey,
        language,
        assessment,
        userAssessment,
        questionIdentifier,
        answerIdentifier,
        surveyIdentifier,
        choiceSet,
        surveyQuestion,
        answerRule,
        userAudit,
        filter,
        filterAnswer,
        file,
        answerComment,
        assessmentAnswer,
    };
};


module.exports = function daosGenerator(db) {
    if (db.schemas) {
        const result = db.schemas.reduce((r, schema) => {
            r[schema] = doasPerSchema(db[schema]);
            r.generator = daosGenerator;
            return r;
        }, {});
        return Object.assign({ sequelize: db.sequelize }, result);
    }
    const daos = doasPerSchema(db, daosGenerator);
    return Object.assign({ generator: daosGenerator }, daos);
};
