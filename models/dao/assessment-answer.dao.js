'use strict';

const _ = require('lodash');

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');
const SPromise = require('../../lib/promise');
const queryrize = require('../../lib/queryrize');

const CSVConverterExport = require('../../export/csv-converter');

const copySql = queryrize.readQuerySync('copy-answers.sql');

const mergeAnswerComments = function (answers, comments, scope) {
    // console.log("answers passed ito mergeAnswerComments")
    // console.log(answers)
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
            } else if (scope === 'export') {
                Object.assign(answer, { comment: {} });
            }
            if (commentHistory) {
                Object.assign(answer, { commentHistory });
            } else if (scope === 'export') {
                Object.assign(answer, { commentHistory: [] });
            }
        }
    });

    if (scope === 'export') {
        return answers;
    }
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

const orderAssessmentAnswerExportObjects = function orderAssessmentAnswerExportObjects(answers, includeComments) { // eslint-disable-line max-len
    return answers.map((e) => {
        if (includeComments) {
            return Object.assign({}, {
                surveyId: e.surveyId,
                questionId: e.questionId,
                questionType: e.questionType,
                assessmentId: e.assessmentId,
                userId: e.userId,
                meta: e.meta,
                value: e.value,
                group: e.group,
                stage: e.stage,
                surveyName: e.surveyName,
                weight: e.weight,
                date: e.date,
                questionText: e.questionText,
                questionInstruction: e.questionInstruction,
                choiceText: e.choiceText,
                choiceType: e.choiceType || '',
                code: e.code,
                comment: e.comment || {},
                commentHistory: e.commentHistory || [],
            });
        }
        return Object.assign({}, {
            surveyId: e.surveyId,
            questionId: e.questionId,
            questionType: e.questionType,
            assessmentId: e.assessmentId,
            userId: e.userId,
            meta: e.meta,
            value: e.value,
            group: e.group,
            stage: e.stage,
            surveyName: e.surveyName,
            weight: e.weight,
            date: e.date,
            questionText: e.questionText,
            questionInstruction: e.questionInstruction,
            choiceText: e.choiceText,
            choiceType: e.choiceType || '',
            code: e.code,
        });
    });
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


    appendCommentsToExport(answers) {
        const promises = answers.map(a => this.answerComment.listAnswerCommentsWithHistory({ assessmentId: a.assessmentId }));// eslint-disable-line max-len

        return Promise.all(promises).then((comments) => {
            const answersWithComments = answers.map((a, indx) => {
                if (comments.length) {
                    let currComments = comments[indx];

                    currComments = currComments.map((commentObject) => {
                        const sansIds = commentObject;
                        if (sansIds.comment) {
                            sansIds.comment = _.omit(sansIds.comment, 'id');
                        }
                        if (sansIds.commentHistory) {
                            sansIds.commentHistory =
                                sansIds.commentHistory.map(comment => _.omit(comment, 'id'));
                        }
                        return sansIds;
                    });

                    const answerWithComments = mergeAnswerComments([a], currComments, 'export');
                    if (answerWithComments[0].commentHistory &&
                        answerWithComments[0].commentHistory.length) {
                        answerWithComments[0].commentHistory =
                            _.sortBy(answerWithComments[0].commentHistory, comment => comment.reason);// eslint-disable-line max-len
                    }

                    return answerWithComments;
                }
                return [Object.append(a, { comments: {}, commentHistory: [] })];
            });

            return _.flatten(answersWithComments);
        });
    }

    exportAssessmentAnswers(options) {
        const surveyId = options.surveyId;
        const questionId = options.questionId;
        const includeComments = options.includeComments;
        // TODO: const sectionId = options.sectionId;
        // TODO: const userIds = options.userIds
        if (!surveyId) {
            SurveyError.reject('surveyMustBeSpecified');
        }


        return this.db.SurveyQuestion.findAll({
            where: { surveyId },
            raw: true,
            attrubutes: ['questionId', 'line'],
        }).then(surveyQuestions => this.db.SurveyText.findAll({
            where: { survey_id: surveyId },
            raw: true,
            attributes: ['name', 'surveyId'],
        }).then(surveys => this.db.AssessmentSurvey.findAll({
            where: { survey_id: surveyId },
            raw: true,
            attributes: ['assessmentId', 'surveyId'],
        }).then((surveyAssessments) => {
            let questionIds = [questionId];
            if (!questionId && questionId !== 0) {
                questionIds = surveyQuestions.map(r => r.questionId);
            }
            const questionLines = surveyQuestions.map(r => [r.questionId, r.line]);
            const questionLinesMap = new Map(questionLines);
            const assessmentIds = surveyAssessments.map(r => r.assessmentId);

            const newOptions = {
                surveyId,
                questionIds,
                assessmentIds,
                scope: 'export',
                meta: true,
                createdAt: true,
            };
            return this.answer.listAnswers(newOptions)
                .then(answers => this.db.Assessment.findAll({
                    where: { id: { $in: assessmentIds } },
                    raw: true,
                    attributes: ['id', 'group', 'stage'],
                }).then(assessments => this.db.QuestionText.findAll({
                    where: { id: { $in: questionIds } },
                    raw: true,
                    attributes: ['id', 'text', 'instruction'],
                }).then(questionTexts => this.db.AssessmentAnswer.findAll({
                    where: { assessment_id: { $in: assessmentIds } },
                    raw: true,
                    attributes: ['assessmentId', 'status'],
                }).then((assessmentStatuses) => {
                    const assessmentStatusInput =
                        assessmentStatuses.map(r => [r.assessmentId, r.status]);
                    const assessmentStatusMap = new Map(assessmentStatusInput);

                    const qTextsMapInput =
                        questionTexts.map(r => [r.id, { text: r.text, instruction: r.instruction }]);// eslint-disable-line max-len
                    const qTextsMap = new Map(qTextsMapInput);
                    const surveyNames = surveys.map(r => [r.surveyId, r.name]);
                    const surveyNameMap = new Map(surveyNames);
                    const assessmentMapInput =
                        assessments.map(r => [r.id, { group: r.group, stage: r.stage }]);
                    const assessmentMap = new Map(assessmentMapInput);

                    const latestAssessments = new Map();
                    const newAnswers = answers.map((a) => {
                        const createdAtDate = new Date(a.createdAt);

                        const month = (createdAtDate.getMonth() + 1).length > 1 ?
                                        createdAtDate.getMonth() :
                                        `0${createdAtDate.getMonth() + 1}`;
                        const year = createdAtDate.getFullYear();
                        const day = createdAtDate.getDate();
                        const date = `${year}-${
                                    month}-${
                                    day}`;

                        const newAnswer = Object.assign(a, {
                            group: `${assessmentMap.get(a.assessmentId).group}`,
                            stage: `${assessmentMap.get(a.assessmentId).stage}`,
                            surveyName: surveyNameMap.get(surveyId),
                            weight: '',
                            date,
                            questionText: qTextsMap.get(a.questionId).text || '',
                            questionInstruction: qTextsMap.get(a.questionId).instruction || '',
                            choiceText: '',
                            choiceType: a.choiceType || '',
                            code: '',
                            value: a.value || '',
                        });
                        delete newAnswer.createdAt;
                        return newAnswer;
                    });

                    assessments.forEach((a) => {
                        if ((latestAssessments[a.group] &&
                            a.stage > latestAssessments[a.group].stage) ||
                            !latestAssessments[a.group]) {
                            latestAssessments[a.group] = a;
                        }
                    });

                    const latestStageAnswers =
                        newAnswers.filter(a => assessmentStatusMap.get(a.assessmentId) === 'completed' &&
                            a.assessmentId === latestAssessments[a.group].id);// eslint-disable-line max-len

                    if (latestStageAnswers.length &&
                        _.some(latestStageAnswers, a => !!a.questionChoiceId)) {
                        return this.question.questionChoice.getAllQuestionChoices(newOptions.questionIds) // eslint-disable-line max-len
                            .then((res) => {
                                const choiceMapInput = res.map(r => [r.id, r.text]);
                                const choiceTextMap = new Map(choiceMapInput);
                                const answersWithValues = latestStageAnswers.map((a) => {
                                    const newAnswer = Object.assign(a, {
                                        choiceText: choiceTextMap.get(a.questionChoiceId) || '',
                                        code: a.code || '',
                                    });
                                    delete newAnswer.questionChoiceId;
                                    return newAnswer;
                                });
                                if (includeComments) {
                                    return this.appendCommentsToExport(answersWithValues)
                                            .then((answersWithComments) => {
                                                const finalAnswers = orderAssessmentAnswerExportObjects(answersWithComments, includeComments);// eslint-disable-line max-len
                                                if (questionId || questionId === 0) {
                                                    return _.sortBy(finalAnswers, a => a.group);
                                                }

                                                return _.sortBy(finalAnswers, [
                                                    a => a.group,
                                                    a => questionLinesMap.get(a.questionId),
                                                ]);
                                            });
                                }

                                const finalAnswers = orderAssessmentAnswerExportObjects(answersWithValues, includeComments);// eslint-disable-line max-len
                                if (questionId || questionId === 0) {
                                    return _.sortBy(finalAnswers, a => a.group);
                                }

                                return _.sortBy(finalAnswers, [
                                    a => a.group,
                                    a => questionLinesMap.get(a.questionId),
                                ]);
                            });
                    }
                    if (includeComments) {
                        return this.appendCommentsToExport(latestStageAnswers)
                            .then((answersWithComments) => {
                                const finalAnswers = orderAssessmentAnswerExportObjects(answersWithComments, includeComments);// eslint-disable-line max-len
                                if (questionId || questionId === 0) {
                                    return _.sortBy(finalAnswers, a => a.group);
                                }

                                return _.sortBy(finalAnswers, [
                                    a => a.group,
                                    a => questionLinesMap.get(a.questionId),
                                ]);
                            });
                    }
                    const finalAnswers = orderAssessmentAnswerExportObjects(latestStageAnswers, includeComments);// eslint-disable-line max-len
                    if (questionId || questionId === 0) {
                        return _.sortBy(finalAnswers, a => a.group);
                    }

                    return _.sortBy(finalAnswers, [
                        a => a.group,
                        a => questionLinesMap.get(a.questionId),
                    ]);
                }))));
        })));
    }

    exportAssessmentAnswersCSV(options) {
        const csvConverter = new CSVConverterExport();
        return this.exportAssessmentAnswers(options)
                .then((answers) => {
                    if (answers.length) {
                        return csvConverter.dataToCSV(answers);
                    }
                    return '';
                });
    }
};
