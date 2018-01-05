'use strict';

const _ = require('lodash');

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');
const SPromise = require('../../lib/promise');
const queryrize = require('../../lib/queryrize');

const CSVConverterExport = require('../../export/csv-converter');

const copySql = queryrize.readQuerySync('copy-answers.sql');
const copyCommentsSql = queryrize.readQuerySync('copy-answer-comments.sql');

const mergeAnswerComments = function (answers, comments) {
    const commentsMap = _.keyBy(comments, 'questionId');
    const insertedComments = new Set();
    answers.forEach((answer) => {
        const questionId = answer.questionId;
        const questionComments = commentsMap[questionId];
        if (questionComments) {
            insertedComments.add(questionId);
            Object.assign(answer, questionComments);
        }
    });
    comments.forEach((comment) => {
        const questionId = comment.questionId;
        if (!insertedComments.has(questionId)) {
            const ccomments = comment.comments;
            const language = ccomments[ccomments.length - 1].language;
            const r = Object.assign({ language }, comment);
            answers.push(r);
        }
    });
    return answers;
};


module.exports = class AnswerAssessmentDAO extends Base {
    constructor(db, dependencies) {
        super(db);
        Object.assign(this, dependencies);
    }

    getMasterId(inputRecord, transaction) {
        const { userId, surveyId, assessmentId } = inputRecord;
        if (!assessmentId) {
            return SPromise.resolve({ userId, surveyId, assessmentId: null });
        }
        const where = { assessmentId };
        const attributes = ['surveyId'];
        return this.db.AssessmentSurvey.findAll({ where, raw: true, attributes, transaction })
            .then(result => result.map(r => r.surveyId))
            .then((surveyIds) => {
                if (!surveyId) {
                    if (surveyIds.length === 1) {
                        return surveyIds[0];
                    }
                    return SurveyError.reject('answerInvalidAssesSurveys');
                }
                if (surveyIds.indexOf(surveyId) >= 0) {
                    return surveyId;
                }
                return SurveyError.reject('answerInvalidSurveyInAsses');
            })
            .then(validSurveyId => ({ userId, surveyId: validSurveyId, assessmentId }));
    }

    updateStatus(assessmentId, status, transaction) {
        const Table = this.db.AssessmentAnswer;
        return Table.findOne({
            where: { assessmentId },
            raw: true,
            attributes: ['status'],
            transaction,
        })
            .then((existingRecord) => {
                const record = { assessmentId, status };
                if (!existingRecord) {
                    return Table.create(record, { transaction });
                } else if (existingRecord.status !== status) {
                    return Table.destroy({ where: { assessmentId }, transaction })
                        .then(() => Table.create(record, { transaction }));
                }
                return null;
            });
    }

    createAssessmentAnswersTx(inputRecord, transaction) {
        const { answers, comments } = inputRecord.answers.reduce((r, answer) => {
            const { questionId, comments: newComments } = answer;
            if (newComments) {
                newComments.forEach(comment => r.comments.push({ questionId, comment }));
            }
            if (answer.answer || answer.answers) {
                const a = _.cloneDeep(answer);
                r.answers.push(_.omit(a, 'comments'));
            }
            return r;
        }, { answers: [], comments: [] });
        const status = inputRecord.status || 'completed';
        const language = inputRecord.language || 'en';
        return this.getMasterId(inputRecord, transaction)
            .then(masterId => this.answer.validateCreate(masterId, answers, status, transaction)
                .then(() => this.updateStatus(inputRecord.assessmentId, status, transaction))
                .then(() => {
                    if (answers.length) {
                        const ids = _.map(answers, 'questionId');
                        const where = { questionId: { $in: ids } };
                        where.assessmentId = masterId.assessmentId;
                        return this.db.Answer.destroy({ where, transaction });
                    }
                    return null;
                })
                .then(() => {
                    if (comments.length) {
                        const ac = this.answerComment;
                        const common = Object.assign({ language }, masterId);
                        return ac.createAnswerCommentsTx(common, comments, transaction);
                    }
                    return null;
                })
                .then(() => {
                    if (answers.length) {
                        const payload = { masterId, answers, language };
                        return this.answer.prepareAndFileAnswer(payload, transaction);
                    }
                    return null;
                }));
    }

    createAssessmentAnswers(input) {
        return this.transaction(tx => this.createAssessmentAnswersTx(input, tx));
    }

    getAssessmentAnswers({ assessmentId }) {
        return this.getAssessmentAnswersOnly({ assessmentId })
            .then(answers => this.getAssessmentAnswersStatus({ assessmentId })
                .then(status => ({ status, answers })));
    }

    getAssessmentAnswersOnly({ assessmentId }) {
        return this.answer.listAnswers({ scope: 'assessment', assessmentId })
            .then(answers => this.answerComment.listAnswerComments({ assessmentId })
                .then((comments) => {
                    if (answers && answers.length) {
                        if (comments.length) {
                            return mergeAnswerComments(answers, comments);
                        }
                        return answers;
                    }
                    const commentsLength = comments.length;
                    if (commentsLength) {
                        return comments;
                    }
                    return answers;
                }));
    }

    copyAssessmentAnswersTx(inputRecord, transaction) {
        const status = inputRecord.status || 'completed';
        return this.getMasterId(inputRecord, transaction)
            .then(masterId => this.answer.updateStatus(masterId, status, transaction)
                .then(() => {
                    const where = {};
                    if (masterId.assessmentId) {
                        where.assessmentId = masterId.assessmentId;
                    } else {
                        where.userId = masterId.userId;
                        where.surveyId = masterId.surveyId;
                    }
                    return this.db.Answer.destroy({ where, transaction })
                        .then(() => this.db.AnswerComment.destroy({ where, transaction }));
                })
                .then(() => {
                    const { userId, assessmentId, prevAssessmentId } = inputRecord;
                    const params = {
                        user_id: userId,
                        assessment_id: assessmentId,
                        prev_assessment_id: prevAssessmentId,
                    };
                    return this.query(copySql, params, transaction)
                        .then(() => this.query(copyCommentsSql, params, transaction));
                }));
    }

    copyAssessmentAnswers(input) {
        return this.transaction(tx => this.copyAssessmentAnswersTx(input, tx));
    }

    getAssessmentAnswersStatus({ assessmentId }) {
        const where = { assessmentId };
        return this.db.AssessmentAnswer
                      .findOne({ where, raw: true, attributes: ['status'] })
            .then(record => (record ? record.status : 'new'));
    }

    getAssessmentAnswersList(options = {}) {
        return this.assessment.listAssessments(options)
            .then((assessments) => {
                if (assessments.length) {
                    const ids = assessments.map(r => r.id);
                    return this.db.AssessmentAnswer.findAll({
                        where: { assessmentId: { $in: ids } },
                        raw: true,
                        attributes: ['assessmentId', 'status'],
                    })
                        .then((answers) => {
                            const mapInput = answers.map(r => [r.assessmentId, r.status]);
                            const map = new Map(mapInput);
                            assessments.forEach((r) => {
                                r.status = map.get(r.id) || 'new';
                            });
                            if (options.assessmentAnswersStatus) {
                                return assessments.filter(r =>
                                    r.status === options.assessmentAnswersStatus);
                            }
                            return assessments;
                        });
                }
                return assessments;
            });
    }

    listAssessmentAnswers(options) {
        const surveyId = options.surveyId;
        const sectionId = options.sectionId;
        const questionId = options.questionId;

        if (sectionId && questionId) {
            SurveyError.reject('surveyBothQuestionsSectionsSpecified');
        }
        return this.db.AssessmentSurvey.findAll({
            where: { survey_id: surveyId },
            raw: true,
            attributes: ['assessmentId', 'surveyId'],
        }).then((assessments) => {
            const assessmentIds = assessments.map(r => r.assessmentId);
            const newOptions = { surveyId, assessmentIds, questionIds: [questionId], scope: 'export' };
            return this.answer.listAnswers(newOptions)
                .then((answers) => {
                    if (!answers.length) {
                        return SurveyError.reject('surveyNotFound');
                    }
                    return answers;
                });
        });
    }


    exportAssessmentAnswersCSV(options) {
        const csvConverter = new CSVConverterExport();
        return this.listAssessmentAnswers(options)
            .then(answers => csvConverter.dataToCSV(answers));
    }
};
