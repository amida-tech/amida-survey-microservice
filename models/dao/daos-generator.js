'use strict';

const UserDAO = require('./user.dao');
const AuthDAO = require('./auth.dao');
const QuestionChoiceDAO = require('./question-choice.dao');
const QuestionDAO = require('./question.dao');
const AnswerDAO = require('./answer.dao');
const SurveyDAO = require('./survey.dao');
const SurveyQuestionDAO = require('./survey-question.dao');
const ProfileSurveyDAO = require('./profile-survey.dao');
const ProfileDAO = require('./profile.dao');
const LanguageDAO = require('./language.dao');
const SectionDAO = require('./section.dao');
const SurveySectionQuestionDAO = require('./survey-section-question.dao');
const SurveySectionDAO = require('./survey-section.dao');
const SmtpDAO = require('./smtp.dao');
const UserSurveyDAO = require('./user-survey.dao');
const AssessmentDAO = require('./assessment.dao');
const UserAssessmentDAO = require('./user-assessment.dao');
const QuestionIdentifierDAO = require('./question-identifier.dao');
const AnswerIdentifierDAO = require('./answer-identifier.dao');
const AnswerRuleDAO = require('./answer-rule.dao');
const SurveyIdentifierDAO = require('./survey-identifier.dao');
const ChoiceSetDAO = require('./choice-set.dao');
const ResearchSiteDAO = require('./research-site.dao');
const Registry = require('./registry.dao');
const UserAuditDAO = require('./user-audit.dao');
const Macro = require('./macro');
const FilterDAO = require('./filter.dao');
const FilterAnswerDAO = require('./filter-answer.dao');
const FileDAO = require('./file.dao');

const doasPerSchema = function (db, daosGenerator) {
    const registry = new Registry(db);
    const questionIdentifier = new QuestionIdentifierDAO(db);
    const answerIdentifier = new AnswerIdentifierDAO(db);
    const surveyIdentifier = new SurveyIdentifierDAO(db);
    const user = new UserDAO(db, {});
    const auth = new AuthDAO(db);
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
        surveyQuestion, answerRule, registry, generator: daosGenerator,
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
    const profileSurvey = new ProfileSurveyDAO(db, { survey, answer });
    const profile = new ProfileDAO(db, { profileSurvey, survey, answer, user });
    const language = new LanguageDAO(db);
    const smtp = new SmtpDAO(db);
    const assessment = new AssessmentDAO(db);
    const userAssessment = new UserAssessmentDAO(db, { answer });
    const researchSite = new ResearchSiteDAO(db);
    const userAudit = new UserAuditDAO(db);
    const macro = new Macro(db, { survey, profileSurvey });
    const filterAnswer = new FilterAnswerDAO(db);
    const filter = new FilterDAO(db, { filterAnswer });
    const file = new FileDAO(db);

    return {
        sequelize: db.sequelize,
        user,
        auth,
        section,
        surveySection,
        questionChoice,
        question,
        answer,
        survey,
        userSurvey,
        profileSurvey,
        profile,
        language,
        smtp,
        assessment,
        userAssessment,
        questionIdentifier,
        answerIdentifier,
        surveyIdentifier,
        choiceSet,
        surveyQuestion,
        answerRule,
        researchSite,
        registry,
        userAudit,
        macro,
        filter,
        filterAnswer,
        file,
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
