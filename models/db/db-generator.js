'use strict';

const config = require('../../config');

const sequelizeGenerator = require('./sequelize-generator');
const surveyStatus = require('./survey-status.model');
const user = require('./user.model');
const questionType = require('./question-type.model');
const question = require('./question.model');
const choiceSet = require('./choice-set.model');
const questionChoice = require('./question-choice.model');
const questionChoiceText = require('./question-choice-text.model');
const questionText = require('./question-text.model');
const answerRuleLogic = require('./answer-rule-logic.model');
const answerRule = require('./answer-rule.model');
const answerRuleValue = require('./answer-rule-value.model');
const surveyQuestion = require('./survey-question.model');
const answerType = require('./answer-type.model');
const answer = require('./answer.model');
const survey = require('./survey.model');
const profileSurvey = require('./profile-survey.model');
const surveyText = require('./survey-text.model');
const language = require('./language.model');
const section = require('./section.model');
const sectionText = require('./section-text.model');
const surveySection = require('./survey-section.model');
const surveySectionQuestion = require('./survey-section-question.model');
const smtpText = require('./smtp-text.model');
const smtp = require('./smtp.model');
const userSurvey = require('./user-survey.model');
const assessment = require('./assessment.model');
const assessmentSurvey = require('./assessment-survey.model');
const userAssessment = require('./user-assessment.model');
const userAssessmentAnswer = require('./user-assessment-answer.model');
const questionIdentifier = require('./question-identifier.model');
const answerIdentifier = require('./answer-identifier.model');
const surveyIdentifier = require('./survey-identifier.model');
const stagingBhrGap = require('./staging-bhr-gap.model');
const userAudit = require('./user-audit.model');
const registry = require('./registry.model');
const filter = require('./filter.model');
const filterAnswer = require('./filter-answer.model');
const file = require('./file.model');
const smtpType = require('./smtp-type.model');

const questionBelongsTo = function () {
    const result = {
        as: 'question',
        foreignKey: {
            allowNull: false,
            fieldName: 'questionId',
            field: 'question_id',
            references: {
                model: 'question',
                key: 'id',
            },
        },
    };
    return result;
};

const questionChoiceBelongsTo = function () {
    return {
        as: 'questionChoice',
        foreignKey: {
            fileName: 'questionChoiceId',
            field: 'question_choice_id',
            references: {
                model: 'question_choice',
                key: 'id',
            },
        },
    };
};

const defineTables = function (sequelize, Sequelize, schema) {
    const SurveyStatus = surveyStatus(sequelize, Sequelize, schema);
    const User = user(sequelize, Sequelize, schema);
    const QuestionType = questionType(sequelize, Sequelize, schema);
    const Question = question(sequelize, Sequelize, schema);
    const ChoiceSet = choiceSet(sequelize, Sequelize, schema);
    const QuestionChoice = questionChoice(sequelize, Sequelize, schema);
    const QuestionChoiceText = questionChoiceText(sequelize, Sequelize, schema);
    const QuestionText = questionText(sequelize, Sequelize, schema);
    const AnswerRuleLogic = answerRuleLogic(sequelize, Sequelize, schema);
    const AnswerRule = answerRule(sequelize, Sequelize, schema);
    const AnswerRuleValue = answerRuleValue(sequelize, Sequelize, schema);
    const SurveyQuestion = surveyQuestion(sequelize, Sequelize, schema);
    const AnswerType = answerType(sequelize, Sequelize, schema);
    const Answer = answer(sequelize, Sequelize, schema);
    const Survey = survey(sequelize, Sequelize, schema);
    const ProfileSurvey = profileSurvey(sequelize, Sequelize, schema);
    const SurveyText = surveyText(sequelize, Sequelize, schema);
    const Language = language(sequelize, Sequelize, schema);
    const Section = section(sequelize, Sequelize, schema);
    const SectionText = sectionText(sequelize, Sequelize, schema);
    const SurveySection = surveySection(sequelize, Sequelize, schema);
    const SurveySectionQuestion = surveySectionQuestion(sequelize, Sequelize, schema);
    const SmtpText = smtpText(sequelize, Sequelize, schema);
    const Smtp = smtp(sequelize, Sequelize, schema);
    const UserSurvey = userSurvey(sequelize, Sequelize, schema);
    const Assessment = assessment(sequelize, Sequelize, schema);
    const AssessmentSurvey = assessmentSurvey(sequelize, Sequelize, schema);
    const UserAssessment = userAssessment(sequelize, Sequelize, schema);
    const UserAssessmentAnswer = userAssessmentAnswer(sequelize, Sequelize, schema);
    const QuestionIdentifier = questionIdentifier(sequelize, Sequelize, schema);
    const AnswerIdentifier = answerIdentifier(sequelize, Sequelize, schema);
    const SurveyIdentifier = surveyIdentifier(sequelize, Sequelize, schema);
    const StagingBhrGap = stagingBhrGap(sequelize, Sequelize, schema);
    const UserAudit = userAudit(sequelize, Sequelize, schema);
    const Registry = registry(sequelize, Sequelize, schema);
    const Filter = filter(sequelize, Sequelize, schema);
    const FilterAnswer = filterAnswer(sequelize, Sequelize, schema);
    const File = file(sequelize, Sequelize, schema);
    const SmtpType = smtpType(sequelize, Sequelize, schema);

    Answer.belongsTo(Question, questionBelongsTo());
    Answer.belongsTo(QuestionChoice, questionChoiceBelongsTo());
    Answer.belongsTo(User, {
        as: 'user',
        foreignKey: {
            fieldName: 'userId',
            field: 'user_id',
            references: {
                model: 'user',
                key: 'id',
            },
        },
    });

    QuestionIdentifier.belongsTo(Question, questionBelongsTo());
    AnswerIdentifier.belongsTo(Question, questionBelongsTo());
    AnswerIdentifier.belongsTo(QuestionChoice, questionChoiceBelongsTo());

    AnswerRuleValue.belongsTo(QuestionChoice, questionChoiceBelongsTo());

    AnswerRule.belongsTo(Question, questionBelongsTo());
    AnswerRule.belongsTo(Question, {
        as: 'answerQuestion',
        foreignKey: {
            allowNull: false,
            fieldName: 'answerQuestionId',
            field: 'answer_question_id',
            references: {
                model: 'question',
                key: 'id',
            },
        },
    });

    SurveyQuestion.belongsTo(Question, questionBelongsTo());

    SurveySection.belongsTo(Section, {
        as: 'section',
        onUpdate: 'NO ACTION',
        foreignKey: {
            allowNull: false,
            field: 'section_id',
            references: {
                model: 'section',
                key: 'id',
            },
        },
    });

    UserAssessment.belongsTo(Assessment, {
        as: 'assessment',
        foreignKey: {
            allowNull: false,
            fieldName: 'assessmentId',
            field: 'assessment_id',
            references: {
                model: 'assessment',
                key: 'id',
            },
        },
    });

    FilterAnswer.belongsTo(Question, questionBelongsTo());
    FilterAnswer.belongsTo(QuestionChoice, questionChoiceBelongsTo());

    return {
        sequelize,
        SurveyStatus,
        User,
        Section,
        SectionText,
        SurveySection,
        SurveySectionQuestion,
        QuestionType,
        QuestionChoice,
        QuestionChoiceText,
        Question,
        QuestionText,
        AnswerRuleLogic,
        AnswerRule,
        AnswerRuleValue,
        SurveyQuestion,
        AnswerType,
        Answer,
        Survey,
        SurveyText,
        ProfileSurvey,
        Language,
        SmtpText,
        Smtp,
        UserSurvey,
        Assessment,
        AssessmentSurvey,
        UserAssessment,
        UserAssessmentAnswer,
        QuestionIdentifier,
        AnswerIdentifier,
        SurveyIdentifier,
        ChoiceSet,
        StagingBhrGap,
        UserAudit,
        Registry,
        Filter,
        FilterAnswer,
        File,
        SmtpType,
        schema,
    };
};

module.exports = function dbGenerator(inputSchema, inputDbName) {
    if (inputSchema && Array.isArray(inputSchema)) {
        const { Sequelize, sequelize } = sequelizeGenerator(true, inputDbName);
        const tables = inputSchema.reduce((r, schema) => {
            const schemaTables = defineTables(sequelize, Sequelize, schema);
            r[schema] = schemaTables;
            return r;
        }, {});
        return Object.assign({ sequelize }, { schemas: inputSchema }, tables);
    }
    const schema = inputSchema || config.db.schema;
    const { Sequelize, sequelize } = sequelizeGenerator(schema !== 'public', inputDbName);
    const schemaTables = defineTables(sequelize, Sequelize, schema);
    return Object.assign({ sequelize, generator: dbGenerator }, schemaTables);
};
