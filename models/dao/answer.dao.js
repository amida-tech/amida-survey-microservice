'use strict';

const _ = require('lodash');

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');
const logger = require('../../logger');
const queryrize = require('../../lib/queryrize');
const SPromise = require('../../lib/promise');

const answerCommon = require('./answer-common');

const ExportCSVConverter = require('../../export/csv-converter.js');
const ImportCSVConverter = require('../../import/csv-converter.js');

const fedQxChoiceQuery = queryrize.readQuerySync('federated-question-choice-select.sql');

const evaluateAnswerRule = function ({ logic, answer }, questionAnswer) {
    if (logic === 'exists') {
        if (questionAnswer && (questionAnswer.answer || questionAnswer.answers)) {
            return true;
        }
    }
    if (logic === 'not-exists') {
        if (!(questionAnswer && (questionAnswer.answer || questionAnswer.answers))) {
            return true;
        }
    }
    if (logic === 'equals') {
        if (!questionAnswer) {
            return false;
        }

        if (_.isEqual(answer, questionAnswer.answer)) {
            return true;
        }
    }
    if (logic === 'not-equals') {
        if (!questionAnswer) {
            return false;
        }
        if (!_.isEqual(answer, questionAnswer.answer)) {
            return true;
        }
    }
    return false;
};

const evaluateEnableWhen = function (rules, answersByQuestionId) {
    return rules.some((rule) => {
        const sourceQuestionId = rule.questionId;
        const sourceAnswer = answersByQuestionId[sourceQuestionId];
        return evaluateAnswerRule(rule, sourceAnswer);
    });
};

const basicExportFields = [
    'surveyId', 'questionId', 'questionChoiceId', 'questionType', 'choiceType', 'value',
];

const isEnabled = function ({ questionId, parents }, maps) {
    const { questionAnswerRulesMap, sectionAnswerRulesMap, answersByQuestionId } = maps;
    const rules = questionAnswerRulesMap.get(questionId);
    if (rules && rules.length) {
        const enabled = evaluateEnableWhen(rules, answersByQuestionId);
        return enabled;
    }
    if (parents && parents.length) {
        const enabled = parents.every((parent) => {
            if (parent.sectionId) {
                const rules2 = sectionAnswerRulesMap.get(parent.sectionId);
                if (rules2 && rules2.length) {
                    return evaluateEnableWhen(rules2, answersByQuestionId);
                }
                return true;
            }
            if (parent.questionId) {
                const rules2 = questionAnswerRulesMap.get(parent.questionId);
                if (rules2 && rules2.length) {
                    return evaluateEnableWhen(rules2, answersByQuestionId);
                }
                return true;
            }
            return true;
        });
        if (!enabled) {
            return false;
        }
    }
    return true;
};

const integerRangeCondition = function (min, max) {
    const minValue = min ? parseInt(min, 10) : null;
    const maxValue = max ? parseInt(max, 10) : null;
    if (max && min) {
        return { $gt: minValue, $lt: maxValue };
    }
    if (max) {
        return { $lt: maxValue };
    }
    return { $gt: minValue };
};

const searchParticipantConditionMaker = {
    integer(dao, answer) {
        const value = answer.value;
        if (value.indexOf(':') < 0) {
            return { value };
        }
        const [min, max] = value.split(':');
        const qColName = dao.qualifiedCol('answer', 'value');
        const col = dao.db.sequelize.col(qColName);
        const fn = dao.db.sequelize.fn('TO_NUMBER', col, '99999');
        const condition = integerRangeCondition(min, max);
        return { value: dao.db.sequelize.where(fn, condition) };
    },
    text(dao, answer) {
        return { value: answer.value };
    },
    choices(dao, answer) {
        if (answer.value) {
            return {
                value: answer.value,
                question_choice_id: answer.questionChoiceId,
            };
        }
        return { question_choice_id: answer.questionChoiceId };
    },
    choice(dao, answer) {
        return { question_choice_id: answer.questionChoiceId };
    },
    choiceRef(dao, answer) {
        return { question_choice_id: answer.questionChoiceId };
    },
};
/**
* helper function for validateAnswerValues. Validates a single answer value.
* @param {Object} answer contains an answer value
* @param {Object} question contains information about the question being
*                           answered
*
* Note: both parameters are passed within a single object.
*/
const validateValue = function ({ answer, question }) {
    const { type, parameter } = question;

    const paramSplit = parameter ?
                       parameter.split(':') :
                       undefined;
    const [min, max] = parameter ?
                       paramSplit.map(v => (v ? parseFloat(v) : null)) :
                       [undefined, undefined];


    switch (type) {
    case 'file':
        if (answer.fileValue === undefined) {
            throw new SurveyError('FileValueNotProvidedForFileQuestion');
        }
        break;
    case 'bullet':
        if (answer.textValue === undefined) {
            throw new SurveyError('TextValueNotProvidedForBulletQuestion');
        }
        break;
    case 'zip':
        if (answer.zipcodeValue === undefined) {
            throw new SurveyError('zipcodeValueNotProvidedForZipcodeQuestion');
        }
        break;
    case 'date':
        if (answer.dateValue === undefined) {
            throw new SurveyError('dateValueNotProvidedForDateQuestion');
        }
        break;
    case 'day':
        if (answer.dayValue === undefined) {
            throw new SurveyError('DayValueNotProvidedForDayQuestion');
        }
        break;
    case 'month':
        if (answer.monthValue === undefined) {
            throw new SurveyError('monthValueNotProvidedForMonthQuestion');
        }
        break;
    case 'year':
        if (answer.yearValue === undefined) {
            throw new SurveyError('yearValueNotProvidedForYearQuestion');
        }
        break;
    case 'feet-inches':
        if (answer.feetInchesValue === undefined) {
            throw new SurveyError('feetInchesValueNotProvidedForfeetInchesQuestion');
        }
        break;
    case 'text':
        if (answer.textValue === undefined) {
            throw new SurveyError('textValueNotProvidedForTextQuestion');
        }
        break;
    case 'pounds':
        if (answer.numberValue === undefined) {
            throw new SurveyError('numberValueAnswerNotProvidedForPoundsQuestion');
        }
        break;
    case 'integer':
        if (answer.integerValue === undefined) {
            throw new SurveyError('integerAnswerNotProvidedForIntegerQuestion');
        }
        break;
    case 'float':
        if (answer.floatValue === undefined) {
            throw new SurveyError('floatAnswerNotProvidedForFloatQuestion');
        }
        break;
    case 'choice':
        if (!answer.choice) {
            throw new SurveyError('choiceAnswerNotProvidedForChoiceQuestion');
        }
        break;
    case 'choice-ref':
        if (answer.choice === undefined) {
            throw new SurveyError('choiceAnswerNotProvidedForChoiceQuestion');
        }
        break;
    case 'choices':
        if (answer.choices === undefined) {
            throw new SurveyError('choicesAnswerNotProvidedForChoicesQuestion');
        }
        break;
    case 'bool':
        if (answer.boolValue === undefined) {
            throw new SurveyError('booleanValueNotProvidedForBooleanQuestion');
        }
        break;
    case 'open-choice':
        if (answer.textValue === undefined && answer.choice === undefined) {
            throw new SurveyError('NeithertextValueorChoiceValueProvidedForOpenChoiceQuestion');
        }
        break;
    case 'blood-pressure':
        if (answer.bloodPressureValue === undefined) {
            throw new SurveyError('BloodPressureValueNotProvidedForBloodPressureQuestion');
        }
        break;
    case 'scale':
        if (answer.numberValue === undefined) {
            throw new SurveyError('NumberValueAnswerNotProvidedForScaleQuestion');
        }
        if (min !== null && answer.numberValue < min) {
            throw new SurveyError('answerOutOfScale', answer.numberValue);
        }
        if (max !== null && answer.numberValue > max) {
            throw new SurveyError('answerOutOfScale', answer.numberValue);
        }
        break;
    default:
        throw new SurveyError('QuestionTypeNotFound');
    }
};
module.exports = class AnswerDAO extends Base {
    constructor(db, dependencies) {
        super(db);
        Object.assign(this, dependencies);
    }

    saveFiles(userId, answers, transaction) {
        if (answers.length < 1) {
            return SPromise.resolve(answers);
        }
        const fileValues = answers.reduce((r, p) => {
            if (p.answers) {
                p.answers.forEach((answer) => {
                    const fileValue = answer.fileValue;
                    if (fileValue && fileValue.content) {
                        r.push(fileValue);
                    }
                });
                return r;
            }
            if (p.answer) {
                const fileValue = p.answer.fileValue;
                if (fileValue && fileValue.content) {
                    r.push(fileValue);
                }
            }
            return r;
        }, []);
        if (fileValues.length < 1) {
            return SPromise.resolve(answers);
        }
        const records = fileValues.map((fileValue) => {
            const content = new Buffer(fileValue.content, 'base64');
            return { userId, name: fileValue.name, content };
        });
        return this.db.File.bulkCreate(records, { transaction, returning: true })
            .then(result => result.forEach(({ id }, index) => {
                fileValues[index].id = id;
                delete fileValues[index].content;
            }))
            .then(() => answers);
    }

    fileAnswer({ userId, surveyId, assessmentId, language, answers }, transaction) {
        const Answer = this.db.Answer;
        const records = answers.reduce((r, p) => {
            const questionId = p.questionId;
            const meta = p.meta || null;
            const dbValues = answerCommon.prepareAnswerForDB(p.answer || p.answers);
            dbValues.forEach((v, index) => {
                const mndx = v.multipleIndex;
                const value = {
                    userId,
                    surveyId,
                    assessmentId,
                    language,
                    questionId,
                    questionChoiceId: v.questionChoiceId || null,
                    fileId: v.fileId || null,
                    multipleIndex: (mndx || mndx === 0) ? mndx : null,
                    value: 'value' in v ? v.value : null,
                    meta: index === 0 ? meta : null,
                };
                r.push(value);
            });
            return r;
        }, []);
        return Answer.bulkCreate(records, { transaction });
    }

    updateStatus({ userId, surveyId }, status, transaction) {
        const UserSurvey = this.db.UserSurvey;
        return UserSurvey.findOne({
            where: { userId, surveyId },
            raw: true,
            attributes: ['status'],
            transaction,
        })
            .then((userSurvey) => {
                const record = { userId, surveyId, status };
                if (!userSurvey) {
                    return UserSurvey.create(record, { transaction });
                } else if (userSurvey.status !== status) {
                    return UserSurvey.destroy({ where: { userId, surveyId }, transaction })
                        .then(() => UserSurvey.create(record, { transaction }));
                }
                return null;
            });
    }


    /**
    * Validates user answers
    * @param {Object} userAnswers Answers to be validated. May contain within
    *                             a nested answers object of the same structure.
    */
    validateAnswerValues(userAnswers) {
        const ids = userAnswers.map(({ questionId }) => questionId);
        const attributes = ['id', 'type', 'parameter', 'maxCount', 'multiple'];
        const where = { id: { $in: ids } };
        return this.db.Question.findAll({ where, attributes, raw: true })
            .then(questions => _.keyBy(questions, 'id'))
            .then((questionMap) => {
                userAnswers.forEach(({ questionId, answer, answers }) => {
                    const question = questionMap[questionId];
                    if (!question) {
                        throw new SurveyError('answerQxNotInSurvey');
                    }
                    const { type, multiple, maxCount } = question;
                    // If answers, check count and send back through with
                    // proper format
                    if (answers) {
                        if (!multiple && type !== 'choices' && type !== 'scale') {
                            throw new SurveyError('multipleAnswersNotAllowedForThisQuestion');
                        } else if (multiple && maxCount && answers.length > maxCount) {
                            throw new SurveyError('moreAnswersProvidedThanAllowed');
                        }
                        answers.forEach((a) => {
                            validateValue({ answer: a, question });
                        });
                    } else if (answer) {
                        validateValue({ answer, question });
                    }
                });
            });
    }

    validateAnswers(masterId, answers, status) {
        const Answer = this.db.Answer;
        const surveyId = masterId.surveyId;
        return this.validateAnswerValues(answers)
            .then(() => this.surveyQuestion.listSurveyQuestions(surveyId, true))
            .then((surveyQuestions) => {
                const answersByQuestionId = _.keyBy(answers, 'questionId');
                return this.answerRule.getQuestionExpandedSurveyAnswerRules(surveyId)
                    .then(({ sectionAnswerRulesMap, questionAnswerRulesMap }) => {
                        surveyQuestions.forEach((r) => {
                            const questionId = r.questionId;
                            const answer = answersByQuestionId[questionId];
                            if (sectionAnswerRulesMap || questionAnswerRulesMap) {
                                const maps = {
                                    questionAnswerRulesMap,
                                    sectionAnswerRulesMap,
                                    answersByQuestionId,
                                };
                                const enabled = isEnabled(r, maps);
                                if (!enabled) {
                                    r.ignore = true;
                                }
                            }
                            if (r.ignore) {
                                if (answer) {
                                    throw new SurveyError('answerToBeSkippedAnswered');
                                }
                                r.required = false;
                                answers.push({ questionId });
                                return;
                            }
                            if (answer && (answer.answer || answer.answers)) {
                                r.required = false;
                            }
                        });
                        return surveyQuestions;
                    });
            })
            .then(surveyQuestions => _.keyBy(surveyQuestions, 'questionId'))
            .then((qxMap) => {
                answers.forEach((answer) => {
                    const qx = qxMap[answer.questionId];
                    if (!qx) {
                        throw new SurveyError('answerQxNotInSurvey');
                    }
                });
                return qxMap;
            })
            .then((qxMap) => {
                if (status === 'completed') {
                    const remainingRequired = new Set();
                    _.values(qxMap).forEach((qx) => {
                        if (qx.required) {
                            remainingRequired.add(qx.questionId);
                        }
                    });
                    if (remainingRequired.size) {
                        const ids = [...remainingRequired];
                        const where = Object.assign({ questionId: { $in: ids } }, masterId);
                        return Answer.findAll({
                            raw: true,
                            where,
                            attributes: ['questionId'],
                        })
                            .then((records) => {
                                const questionIds = records.map(record => record.questionId);
                                const existingRequired = new Set(questionIds);
                                if (existingRequired.size !== remainingRequired.size) {
                                    throw new SurveyError('answerRequiredMissing');
                                }
                            });
                    }
                }
                return null;
            });
    }

    validateCreate(masterId, answers, status) {
        return this.validateAnswers(masterId, answers, status);
    }

    prepareAndFileAnswer({ masterId, answers, language }, transaction) {
        const filteredAnswers = _.filter(answers, r => r.answer || r.answers);
        const userId = masterId.userId;
        return this.saveFiles(userId, filteredAnswers, transaction)
            .then(() => {
                if (filteredAnswers.length) {
                    const record = { language, answers: filteredAnswers };
                    Object.assign(record, masterId);
                    return this.fileAnswer(record, transaction);
                }
                return null;
            });
    }

    createAnswersTx(inputRecord, transaction) {
        const answers = _.cloneDeep(inputRecord.answers);
        const status = inputRecord.status || 'completed';
        const language = inputRecord.language || 'en';
        const { userId, surveyId } = inputRecord;
        const masterId = { userId, surveyId, assessmentId: null };
        return this.validateCreate(masterId, answers, status, transaction)
            .then(() => this.updateStatus(masterId, status, transaction))
            .then(() => {
                const ids = _.map(answers, 'questionId');
                const where = { questionId: { $in: ids } };
                Object.assign(where, masterId);
                return this.db.Answer.destroy({ where, transaction });
            })
            .then(() => this.prepareAndFileAnswer({ masterId, answers, language }, transaction));
    }

    createAnswers(input) {
        return this.transaction(tx => this.createAnswersTx(input, tx));
    }

    listAnswers({ userId, userIds, surveyId, assessmentId,
                  assessmentIds, scope, history, ids, questionIds,
                  meta, createdAt }) {
        const Answer = this.db.Answer;
        const Question = this.db.Question;
        const QuestionChoice = this.db.QuestionChoice;
        scope = scope || 'survey'; // eslint-disable-line no-param-reassign
        const where = {};
        if (ids) {
            where.id = { $in: ids };
        }
        if (userId) {
            where.userId = userId;
        }
        if (userIds) {
            where.userId = { $in: userIds };
        }
        if (surveyId) {
            where.surveyId = surveyId;
        }

        if (assessmentIds) {
            where.assessmentId = { $in: assessmentIds };
        }

        if (assessmentId) {
            where.assessmentId = assessmentId;
        }

        if (!(assessmentId || assessmentIds)) {
            where.assessmentId = null;
        }

        if (questionIds) {
            where.questionId = { $in: questionIds };
        }

        if (scope === 'history-only') {
            where.deletedAt = { $ne: null };
        }

        const attributes = ['questionChoiceId', 'fileId', 'language', 'multipleIndex', 'value'];

        if (scope !== 'export') {
            attributes.push('meta');
        }
        if (scope === 'export' || (scope !== 'assessment' && !surveyId)) {
            attributes.push('surveyId');
        }
        if (scope === 'history-only') {
            attributes.push(this.timestampColumn('answer', 'deleted', 'SSSS.MS'));
        }
        if (userIds || assessmentId) {
            attributes.push('userId');
        }
        if (assessmentIds && surveyId) {
            attributes.push('userId', 'assessmentId', 'questionId');
        }
        if (createdAt) {
            attributes.push('createdAt');
        }

        if (meta) {
            attributes.push('meta');
        }
        const include = [
            { model: Question, as: 'question', attributes: ['id', 'type', 'multiple'] },
            { model: QuestionChoice, as: 'questionChoice', attributes: ['type'] },
        ];
        return Answer.findAll({ raw: true, where, attributes, include, paranoid: !history })
            .then((result) => {
                result.forEach((r) => {
                    if (r['question.type'] === 'choices') {
                        r.choiceType = r['questionChoice.type'];
                    }
                    delete r['questionChoice.type'];
                });
                return result;
            })
            .then((result) => {
                if (scope === 'export') {
                    return result.map((p) => {
                        const r = { surveyId: p.surveyId };
                        r.questionId = p['question.id'];
                        r.questionType = p['question.type'];
                        if (attributes.includes('assessmentId') || attributes.includes('assessmentIds')) {
                            r.assessmentId = p.assessmentId;
                        }
                        if (attributes.includes('userId')) {
                            r.userId = p.userId;
                        }
                        if (attributes.includes('meta')) {
                            r.meta = p.meta || {};
                        }
                        if (attributes.includes('createdAt')) {
                            r.createdAt = p.createdAt;
                        }

                        if (p.questionChoiceId) {
                            r.questionChoiceId = p.questionChoiceId;
                        }
                        if (p.value) {
                            r.value = p.value;
                        }
                        if (p.choiceType) {
                            r.choiceType = p.choiceType;
                        }

                        return r;
                    });
                }
                const groupedResult = _.groupBy(result, (r) => {
                    let key = r['question.id'];
                    if (r.deletedAt) {
                        key = `${r.deletedAt};${key}`;
                    }
                    if (r.surveyId) {
                        key = `${r.surveyId};${key}`;
                    }
                    return key;
                });
                return Object.keys(groupedResult).map((key) => {
                    const v = groupedResult[key];
                    const r = {
                        questionId: v[0]['question.id'],
                        language: v[0].language,
                    };

                    const vWithMata = v.find(e => e.meta);
                    if (vWithMata) {
                        r.meta = vWithMata.meta;
                    }
                    if (v[0]['question.multiple']) {
                        r.answers = answerCommon.generateAnswer(v[0]['question.type'], v, true);
                    } else {
                        r.answer = answerCommon.generateAnswer(v[0]['question.type'], v, false);
                    }
                    if (scope === 'history-only') {
                        r.deletedAt = v[0].deletedAt;
                    }
                    if (v[0].surveyId) {
                        r.surveyId = v[0].surveyId;
                    }
                    return r;
                });
            });
    }

    getAnswers(masterId) {
        return this.listAnswers(masterId);
    }

    exportForUser(userId) {
        return this.listAnswers({ userId, scope: 'export' })
            .then((answers) => {
                const converter = new ExportCSVConverter({ fields: basicExportFields });
                return converter.dataToCSV(answers);
            });
    }

    exportForUsers(userIds) {
        const fields = ['userId', ...basicExportFields];
        return this.listAnswers({ userIds, scope: 'export' })
            .then((answers) => {
                const converter = new ExportCSVConverter({ fields });
                return converter.dataToCSV(answers);
            });
    }

    importAnswers(stream, maps) {
        const { userId, surveyIdMap, questionIdMap, userIdMap } = maps;
        const converter = new ImportCSVConverter({ checkType: false });
        return converter.streamToRecords(stream)
            .then(records => records.map((r) => {
                r.surveyId = surveyIdMap[r.surveyId];
                const questionIdInfo = questionIdMap[r.questionId];
                r.questionId = questionIdInfo.questionId;
                if (r.questionChoiceId) {
                    const choicesIds = questionIdInfo.choicesIds;
                    r.questionChoiceId = choicesIds[r.questionChoiceId];
                } else {
                    r.questionChoiceId = null;
                }
                if (r.value === '') {
                    delete r.value;
                } else {
                    r.value = r.value.toString();
                }
                if (r.choiceType === 'month' || r.questionType === 'month') {
                    if (r.value.length === 1) {
                        r.value = `0${r.value}`;
                    }
                }
                delete r.questionType;
                delete r.choiceType;
                r.userId = userId || userIdMap[r.userId];
                r.language = 'en';
                return r;
            }))
            .then(records => this.db.Answer.bulkCreate(records));
    }

    importRecords(records) {
        const fn = r => r.map(({ id }) => id);
        return this.db.Answer.bulkCreate(records, { returning: true }).then(fn);
    }

    exportBulk(ids) {
        const Answer = this.db.Answer;
        const Question = this.db.Question;
        const QuestionChoice = this.db.QuestionChoice;
        const createdAtColumn = this.timestampColumn('answer', 'created');
        return Answer.findAll({
            where: { id: { $in: ids } },
            attributes: [
                'id', 'userId', 'surveyId', 'questionId',
                'questionChoiceId', 'value', createdAtColumn,
            ],
            include: [
                { model: Question, as: 'question', attributes: ['id', 'type'] },
                { model: QuestionChoice, as: 'questionChoice', attributes: ['type'] },
            ],
            raw: true,
            paranoid: false,
        });
    }

    searchAllParticipants() {
        const attributes = ['id'];
        return this.db.User.findAll({ raw: true, where: { role: 'participant' }, attributes })
            .then(ids => ids.map(({ id }) => ({ userId: id })));
    }

    /**
     * Search users by their survey answers. Returns a count of users only.
     * @param {object} query questionId:value mapping to search users by
     * @returns {integer}
     */
    searchParticipants(criteria) {
        const n = _.get(criteria, 'questions.length');
        if (!n) {
            return this.searchAllParticipants();
        }

        const questionIds = criteria.questions.map(question => question.id);
        if (questionIds.length !== new Set(questionIds).size) {
            return SurveyError.reject('searchQuestionRepeat');
        }

        return this.db.Question.findAll({
            where: { id: { $in: questionIds } },
            raw: true,
            attributes: ['id', 'type'],
        })
            .then(records => new Map(records.map(r => [r.id, r.type])))
            .then((typeMap) => {
                // find answers that match one of the search criteria
                const where = { $or: [] };
                criteria.questions.forEach((question) => {
                    const qxConds = [];
                    answerCommon.prepareFilterAnswersForDB(question.answers).forEach((answer) => {
                        const type = typeMap.get(question.id);
                        const conditionMaker = searchParticipantConditionMaker[_.camelCase(type)];
                        let qxCond;
                        if (conditionMaker) {
                            qxCond = conditionMaker(this, answer);
                        } else {
                            const value = ('value' in answer) ? answer.value : null;
                            qxCond = { value };
                        }
                        qxConds.push(qxCond);
                    });
                    let qxCondsAll = qxConds.length > 1 ? { $or: qxConds } : qxConds[0];
                    if (question.exclude) {
                        qxCondsAll = { $not: qxCondsAll };
                    }
                    const condition = Object.assign({ question_id: question.id }, qxCondsAll);
                    where.$or.push(condition);
                });

                // find users with a matching answer for each question
                // (i.e., users who match all criteria)
                const include = [];
                const having = this.where(this.literal('COUNT(DISTINCT(question_id))'), n);
                const group = ['user_id'];

                // count resulting users
                const attributes = ['userId'];
                const options = { raw: true, where, attributes, include, having, group };
                return this.db.Answer.findAll(options);
            });
    }

    countAllParticipants() {
        return this.db.User.count({ where: { role: 'participant' } })
            .then(count => ({ count }));
    }

    /**
     * Search users by their survey answers. Returns a count of users only.
     * @param {object} query questionId:value mapping to search users by
     * @returns {integer}
     */
    countParticipants(criteria) {
        // if criteria is empty, return count of all users
        if (!_.get(criteria, 'questions.length')) {
            return this.countAllParticipants();
        }

        return this.searchParticipants(criteria)
            .then(results => ({ count: results.length }));
    }

    federatedCriteriaToLocalCriteria(federatedCriteria) {
        const identifiers = federatedCriteria.reduce((r, { identifier }) => {
            if (identifier) {
                r.push(identifier);
            }
            return r;
        }, []);
        return this.db.AnswerIdentifier.findAll({
            raw: true,
            where: { identifier: { $in: identifiers }, type: 'federated' },
            attributes: ['identifier', 'questionId', 'questionChoiceId'],
        })
            .then((records) => {
                const identifierMap = new Map(records.map(r => [r.identifier, r]));
                const texts = federatedCriteria.map(r => r.questionText);
                const sequelize = this.db.sequelize;
                const fn = sequelize.fn('lower', sequelize.col('text'));
                const where = sequelize.where(fn, { $in: texts });
                return this.db.QuestionText.findAll({
                    where, raw: true, attributes: ['questionId', 'text'],
                })
                    .then((qRecords) => {
                        const questionMap = new Map(qRecords.map(r => [r.text, r.questionId]));
                        return { questionMap, identifierMap, records };
                    });
            })
            .then(({ identifierMap, questionMap }) => {
                const qxids = [...questionMap.values()];
                const texts = federatedCriteria.reduce((r, p) => {
                    const text = p.questionChoiceText;
                    if (text) {
                        r.push(`'${text}'`);
                    }
                    return r;
                }, []);
                const replacements = {
                    qxids: `(${qxids.join(', ')})`,
                    texts: `(${texts.join(', ')})`,
                };
                const query = queryrize.replaceParameters(fedQxChoiceQuery, replacements);
                return this.selectQuery(query, replacements)
                    .then((result) => {
                        const choiceMap = result.reduce((r, p) => {
                            let choices = r.get(p.questionId);
                            if (!choices) {
                                choices = new Map();
                                r.set(p.questionId, choices);
                            }
                            choices.set(p.choiceText, p.questionChoiceId);
                            return r;
                        }, new Map());
                        return choiceMap;
                    })
                    .then(choiceMap => ({ identifierMap, questionMap, choiceMap }));
            })
            .then(({ identifierMap, questionMap, choiceMap }) => {
                const runnningMap = new Map();
                const questions = federatedCriteria.reduce((r, criterion) => {
                    const { identifier, questionText, questionChoiceText, exclude } = criterion;
                    let { questionId, questionChoiceId } = identifierMap.get(identifier) || {};
                    if (!questionId) {
                        questionId = questionMap.get(questionText);
                        if (!questionId) {
                            logger.error(`Question '${questionText}' does not exists.`);
                            return r;
                        }
                    }
                    if (!questionChoiceId && questionChoiceText) {
                        const choices = choiceMap.get(questionId);
                        if (!choices) {
                            logger.error(`Question ('${questionText}') does not have choices.`);
                            return r;
                        }
                        questionChoiceId = choices.get(questionChoiceText);
                        if (!questionChoiceId) {
                            logger.error(`Question '${questionText}' does not have choice '${questionChoiceText}'.`);
                            return r;
                        }
                    }
                    let qx = runnningMap.get(questionId);
                    if (!qx) {
                        qx = { id: questionId, answers: [] };
                        if (exclude) {
                            qx.exclude = true;
                        }
                        runnningMap.set(questionId, qx);
                        r.push(qx);
                    }
                    const answer = _.omit(criterion, ['identifier', 'questionText', 'questionChoiceText', 'exclude']);
                    if (questionChoiceId) {
                        answer.choice = questionChoiceId;
                    }
                    qx.answers.push(answer);
                    return r;
                }, []);
                return { questions };
            });
    }

    localCriteriaToFederatedCriteria({ questions }) {
        const questionIds = questions.map(({ id }) => id);
        return this.db.AnswerIdentifier.findAll({
            raw: true,
            where: { questionId: { $in: questionIds }, type: 'federated' },
            attributes: ['identifier', 'questionId', 'questionChoiceId'],
        })
            .then((records) => {
                const identifierMap = records.reduce((r, record) => {
                    const { identifier, questionId, questionChoiceId } = record;
                    if (questionChoiceId) {
                        let identifiers = r.get(questionId);
                        if (!identifiers) {
                            identifiers = new Map();
                            r.set(questionId, identifiers);
                        }
                        identifiers.set(questionChoiceId, identifier);
                        return r;
                    }
                    r.set(questionId, identifier);
                    return r;
                }, new Map());
                return { identifierMap };
            })
            .then(({ identifierMap }) => {
                const qxIds = questions.map(q => q.id);
                if (qxIds.length) {
                    return this.db.QuestionText.findAll({
                        raw: true,
                        where: { questionId: { $in: qxIds } },
                        attributes: ['questionId', 'text'],
                    })
                        .then((r) => {
                            const qxMap = new Map(r.map(p => [
                                p.questionId, p.text.toLowerCase(),
                            ]));
                            return { identifierMap, qxMap };
                        });
                }
                return { identifierMap, qxMap: new Map() };
            })
            .then(({ identifierMap, qxMap }) => {
                const qxChoiceIds = questions.reduce((r, { answers }) => {
                    answers.forEach((answer) => {
                        const choice = answer.choice;
                        if (choice) {
                            r.push(choice);
                        }
                    });
                    return r;
                }, []);
                if (qxChoiceIds.length) {
                    return this.db.QuestionChoiceText.findAll({
                        raw: true,
                        where: { questionChoiceId: { $in: qxChoiceIds } },
                        attributes: ['questionChoiceId', 'text'],
                    })
                        .then((r) => {
                            const qxChoiceMap = new Map(r.map(p => [
                                p.questionChoiceId, p.text.toLowerCase(),
                            ]));
                            return { identifierMap, qxMap, qxChoiceMap };
                        });
                }
                return { identifierMap, qxMap, qxChoiceMap: new Map() };
            })
            .then(({ identifierMap, qxMap, qxChoiceMap }) => questions.reduce((r, { id, exclude, answers }) => { // eslint-disable-line max-len
                const identifierInfo = identifierMap.get(id);
                const questionText = qxMap.get(id);
                answers.forEach((answer) => {
                    const e = { questionText };
                    if (exclude) {
                        e.exclude = true;
                    }
                    if (answer.choice) {
                        e.questionChoiceText = qxChoiceMap.get(answer.choice);
                        if (identifierInfo) {
                            const identifier = identifierInfo.get(answer.choice);
                            if (identifier) {
                                e.identifier = identifier;
                            }
                        }
                        Object.assign(e, _.omit(answer, 'choice'));
                    } else {
                        if (identifierInfo) {
                            e.identifier = identifierInfo;
                        }
                        Object.assign(e, answer);
                    }
                    r.push(e);
                });
                return r;
            }, []));
    }

    searchParticipantsIdentifiers(federatedCriteria) {
        if (federatedCriteria.length < 1) {
            return this.searchAllParticipants();
        }
        return this.federatedCriteriaToLocalCriteria(federatedCriteria)
            .then(criteria => this.searchParticipants(criteria));
    }

    countParticipantsIdentifiers(federatedCriteria) {
        if (federatedCriteria.length < 1) {
            return this.countAllParticipants();
        }
        return this.federatedCriteriaToLocalCriteria(federatedCriteria)
            .then(criteria => this.countParticipants(criteria));
    }

    fillAnswerIdentifiers(answers) {
        const questionIds = answers.map(r => r.questionId);
        const questionIdSet = new Set(questionIds);
        const uniqQuestionIds = [...questionIdSet];
        return this.db.AnswerIdentifier.findAll({
            raw: true,
            where: { questionId: { $in: uniqQuestionIds }, type: 'federated' },
            attributes: ['identifier', 'questionId', 'questionChoiceId'],
        })
            .then((records) => {
                if (records.length === 0) {
                    return new Map();
                }
                return records.reduce((r, record) => {
                    const { identifier, questionId, questionChoiceId } = record;
                    if (questionChoiceId) {
                        let choiceMap = r.get(questionId);
                        if (!choiceMap) {
                            choiceMap = new Map();
                            r.set(questionId, choiceMap);
                        }
                        choiceMap.set(questionChoiceId, identifier);
                        return r;
                    }
                    r.set(questionId, identifier);
                    return r;
                }, new Map());
            })
            .then(identifierMap => answers.map((answer) => {
                const { questionId, questionChoiceId } = answer;
                const e = _.cloneDeep(answer);
                const identifierInfo = identifierMap.get(questionId);
                if (!identifierInfo) {
                    return e;
                }
                if (questionChoiceId) {
                    const identifier = identifierInfo.get(questionChoiceId);
                    if (identifier) {
                        return Object.assign({ identifier }, e);
                    }
                } else {
                    const identifier = identifierInfo;
                    return Object.assign({ identifier }, e);
                }
                return e;
            }));
    }

    federatedListAnswers(federatedCriteria) {
        return this.searchParticipantsIdentifiers(federatedCriteria)
            .then(userIds => userIds.map(({ userId }) => userId))
            .then(userIds => this.listAnswers({ userIds, scope: 'export' }))
            .then(answers => this.fillAnswerIdentifiers(answers, federatedCriteria))
            .then((answers) => {
                if (answers.length === 0) {
                    return answers;
                }
                const questionIds = answers.map(r => r.questionId);
                const questionIdSet = new Set(questionIds);
                const uniqQuestionIds = [...questionIdSet];
                return this.db.QuestionText.findAll({
                    raw: true,
                    where: { questionId: { $in: uniqQuestionIds }, language_code: 'en' },
                    attributes: ['questionId', 'text'],
                })
                    .then((records) => {
                        const map = new Map(records.map(r => [r.questionId, r.text]));
                        answers.forEach((r) => {
                            r.questionText = map.get(r.questionId);
                            delete r.questionId;
                            delete r.questionType;
                            delete r.choiceType;
                            delete r.surveyId;
                        });
                        return answers;
                    });
            })
            .then((answers) => {
                if (answers.length === 0) {
                    return answers;
                }
                const questionChoiceIds = answers.reduce((r, { questionChoiceId }) => {
                    if (questionChoiceId) {
                        r.push(questionChoiceId);
                    }
                    return r;
                }, []);
                if (questionChoiceIds.length === 0) {
                    return answers;
                }
                return this.db.QuestionChoiceText.findAll({
                    raw: true,
                    where: { questionChoiceId: { $in: questionChoiceIds }, language_code: 'en' },
                    attributes: ['questionChoiceId', 'text'],
                })
                    .then((records) => {
                        const map = new Map(records.map(r => [r.questionChoiceId, r.text]));
                        answers.forEach((r) => {
                            if (r.questionChoiceId) {
                                r.questionChoiceText = map.get(r.questionChoiceId);
                            }
                            delete r.questionChoiceId;
                        });
                        return answers;
                    });
            });
    }
};
