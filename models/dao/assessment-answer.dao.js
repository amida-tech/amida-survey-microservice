'use strict';

const _ = require('lodash');

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');
const SPromise = require('../../lib/promise');
const queryrize = require('../../lib/queryrize');

const copySql = queryrize.readQuerySync('copy-answers.sql');

const mergeAnswerComments = function (answers, comments) {
    const commentsMap = _.keyBy(comments, 'questionId');
    const insertedComments = new Set();
    answers.forEach((answer) => {
        const questionId = answer.questionId;
        const commentObject = commentsMap[questionId];
        if (commentObject) {
            insertedComments.add(questionId);
            const { comment, commentHistory } = commentObject;
            if (comment) {
                Object.assign(answer, { comment });
            }
            if (commentHistory) {
                Object.assign(answer, { commentHistory });
            }
        }
    });
    comments.forEach((commentObject) => {
        const { questionId, comment, commentHistory } = commentObject;
        if (!insertedComments.has(questionId)) {
            let language = comment ? comment.language : null;
            if (!language) {
                const n = commentHistory && commentHistory.length;
                if (n) {
                    language = commentHistory[n - 1].language;
                }
            }
            answers.push(Object.assign({ language }, commentObject));
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
            const { questionId, comment: newComment } = answer;
            if (newComment) {
                r.comments.push({ questionId, comment: newComment });
            }
            if (answer.answer || answer.answers) {
                const a = _.cloneDeep(answer);
                r.answers.push(_.omit(a, 'comment'));
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
                        const ids = _.map(comments, 'questionId');
                        const where = { questionId: { $in: ids } };
                        where.assessmentId = masterId.assessmentId;
                        return this.db.AnswerComment.destroy({ where, transaction });
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
            .then(answers => this.answerComment.listAnswerCommentsWithHistory({ assessmentId })
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
                    return this.db.Answer.destroy({ where, transaction });
                })
                .then(() => {
                    const { userId, assessmentId, prevAssessmentId } = inputRecord;
                    const params = {
                        user_id: userId,
                        assessment_id: assessmentId,
                        prev_assessment_id: prevAssessmentId,
                    };
                    return this.query(copySql, params, transaction);
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
};
