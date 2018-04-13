'use strict';

const _ = require('lodash');

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');
const SPromise = require('../../lib/promise');
const queryrize = require('../../lib/queryrize');

const CSVConverterExport = require('../../export/csv-converter');
const ImportCSVConverter = require('../../import/csv-converter.js');

const copySql = queryrize.readQuerySync('copy-answers.sql');

const mergeAnswerComments = function (answers, comments, scope) {
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

        let obj = Object.assign({}, {
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
            questionIndex: e.questionIndex,
            choiceText: e.choiceText,
            choiceType: e.choiceType || '',
            code: e.code
        });
        if (includeComments) {
            obj.comment = e.comment || {},
            obj.commentHistory = e.commentHistory || []
        }
        return obj;
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

    exportAssessmentAnswerAnswers(options) {
        const surveyId = options.surveyId;
        const questionId = options.questionId;
        const includeComments = options.includeComments;
        const sectionId = options.sectionId;
        let questionsPromise;
        // TODO: const userIds = options.userIds
        //TODO: const groups = options.groups

        if (sectionId && questionId) {
            return SurveyError.reject('surveyBothQuestionsSectionsSpecified');
        }

        if (!surveyId) {
            return SurveyError.reject('surveyMustBeSpecified');
        }

        if (sectionId) {
            questionsPromise =
            this.db.SurveySection.findOne({
                where: { sectionId, surveyId },
                attributes: ['id'],
                raw: true,
            }).then((section) => {
                if (section) {
                    return this.db.SurveySectionQuestion.findAll({
                        where: { surveySectionId: sectionId },
                        attributes: ['questionId', 'line'],
                        raw: true,
                        order: 'line',
                    });
                }
                return new Promise((res) => {
                    res([]);
                });
            });
        } else if (questionId) {
            questionsPromise = this.db.SurveyQuestion.findAll({
                where: { surveyId, questionId },
                raw: true,
                attributes: ['questionId', 'line'],
            });
        } else {
            questionsPromise = this.db.SurveyQuestion.findAll({
                where: { surveyId },
                raw: true,
                attributes: ['questionId', 'line'],
            });
        }


        return questionsPromise.then(questions => this.db.SurveyText.findAll({
            where: { survey_id: surveyId },
            raw: true,
            attributes: ['name', 'surveyId'],

        }).then(surveys => this.db.AssessmentSurvey.findAll({
            where: { survey_id: surveyId },
            raw: true,
            attributes: ['assessmentId', 'surveyId'],
        }).then((surveyAssessments) => {
            if (!surveys.length) {
                return SurveyError.reject('surveyNotFound');
            }
            if (!questions.length) {
                if (sectionId) {
                    return SurveyError.reject('sectionNotFound');
                }
                return SurveyError.reject('qxNotFound');
            }
            let questionIds = [questionId];

            if (sectionId !== undefined || questionId === undefined) {
                questionIds = questions.map(r => r.questionId);
            }
            const questionLines = questions.map(r => [r.questionId, r.line]);
            const questionLinesMap = new Map(questionLines);
            const assessmentIds = surveyAssessments.map(r => r.assessmentId);

            const newOptions = {
                questionIds,
                surveyId,
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
                }).then(assessmentStatuses => this.db.QuestionChoice.findAll({
                    where: { id: { $in: answers.map(a => a.questionChoiceId) } },
                }).then((questionChoices) => {
                    const assessmentStatusInput = assessmentStatuses.map(r => [r.assessmentId, r.status]);// eslint-disable-line max-len
                    const assessmentStatusMap = new Map(assessmentStatusInput);

                    const qTextsMapInput = questionTexts.map(r => [r.id, { text: r.text, instruction: r.instruction }]);// eslint-disable-line max-len
                    const qTextsMap = new Map(qTextsMapInput);
                    const surveyNames = surveys.map(r => [r.surveyId, r.name]);
                    const surveyNameMap = new Map(surveyNames);
                    const assessmentMapInput = assessments.map(r => [r.id, { group: r.group, stage: r.stage }]);// eslint-disable-line max-len
                    const assessmentMap = new Map(assessmentMapInput);

                    const latestCompleteAssessments = new Map();
                    const newAnswers = answers.map((a) => {
                        const createdAtDate = new Date(a.createdAt);

                        const month = (createdAtDate.getMonth() + 1).length > 1 ?
                                        createdAtDate.getMonth() :
                                        `0${createdAtDate.getMonth() + 1}`;
                        const year = createdAtDate.getFullYear();
                        const day = createdAtDate.getDate();
                        const date = `${year}-${month}-${day}`;

                        const weight = a.questionChoiceId !== undefined ?
                        questionChoices.find(questionChoice =>
                          questionChoice.id === a.questionChoiceId).weight :
                        null;
                        const newAnswer = Object.assign(a, {
                            group: `${assessmentMap.get(a.assessmentId).group}`,
                            stage: `${assessmentMap.get(a.assessmentId).stage}`,
                            surveyName: surveyNameMap.get(surveyId),
                            weight,
                            date,
                            questionText: qTextsMap.get(a.questionId).text || '',
                            questionInstruction: qTextsMap.get(a.questionId).instruction || '',
                            questionIndex: questionLinesMap.get(a.questionId),
                            choiceText: '',
                            choiceType: a.choiceType || '',
                            code: '',
                            value: a.value || '',
                        });
                        delete newAnswer.createdAt;
                        return newAnswer;
                    });

                    assessments.forEach((a) => {
                        if ((latestCompleteAssessments[a.group] &&
                            a.stage > latestCompleteAssessments[a.group].stage &&
                            assessmentStatusMap.get(a.id) === 'completed') ||
                            (!latestCompleteAssessments[a.group] &&
                            assessmentStatusMap.get(a.id) === 'completed')) {
                            latestCompleteAssessments[a.group] = a;
                        }
                    });

                    const latestCompletedAnswers =
                        newAnswers.filter(a =>
                          latestCompleteAssessments[a.group] &&
                          a.assessmentId === latestCompleteAssessments[a.group].id);


                    if (latestCompletedAnswers.length && _.some(newAnswers, a => !!a.questionChoiceId)) { // eslint-disable-line max-len
                        return this.question.questionChoice.getAllQuestionChoices(newOptions.questionIds) // eslint-disable-line max-len
                            .then((res) => {
                                const choiceMapInput = res.map(r => [r.id, r.text]);
                                const choiceTextMap = new Map(choiceMapInput);
                                const answersWithValues = latestCompletedAnswers.map((a) => {
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
                                               const finalAnswers =
                                                   orderAssessmentAnswerExportObjects(answersWithComments, includeComments);// eslint-disable-line max-len
                                               if (questionId || questionId === 0) {
                                                   return _.sortBy(finalAnswers, [a => a.group, a => a.choiceText]);// eslint-disable-line max-len
                                               }

                                               return _.sortBy(finalAnswers, [
                                                   a => a.group,
                                                   a => questionLinesMap.get(a.questionId),
                                                   a => a.choiceText,
                                               ]);
                                           });
                                }
                                const finalAnswers =
                                        orderAssessmentAnswerExportObjects(latestCompletedAnswers, includeComments);// eslint-disable-line max-len
                                if (questionId || questionId === 0) {
                                    return _.sortBy(finalAnswers, [a => a.group, a => a.choiceText]);// eslint-disable-line max-len
                                }
                                return _.sortBy(finalAnswers, [
                                    a => a.group,
                                    a => questionLinesMap.get(a.questionId),
                                    a => a.choiceText,
                                ]);
                            });
                    } else if (includeComments) {
                        return this.appendCommentsToExport(latestCompletedAnswers)
                               .then((answersWithComments) => {
                                   const finalAnswers =
                                       orderAssessmentAnswerExportObjects(answersWithComments, includeComments);// eslint-disable-line max-len
                                   if (questionId || questionId === 0) {
                                       return _.sortBy(finalAnswers, [a => a.group, a => a.choiceText]);// eslint-disable-line max-len
                                   }

                                   return _.sortBy(finalAnswers, [
                                       a => a.group,
                                       a => questionLinesMap.get(a.questionId),
                                       a => a.choiceText,
                                   ]);
                               });
                    }
                    const finalAnswers =
                                orderAssessmentAnswerExportObjects(latestCompletedAnswers, includeComments);// eslint-disable-line max-len

                    if (questionId || questionId === 0) {
                        return _.sortBy(finalAnswers, [a => a.group, a => a.choiceText]);// eslint-disable-line max-len
                    }
                    return _.sortBy(finalAnswers, [
                        a => a.group,
                        a => questionLinesMap.get(a.questionId),
                        a => a.choiceText,
                    ]);
                })))));
        })));
    }

    exportAssessmentAnswerAnswersCSV(options = {}) {
        const csvConverter = new CSVConverterExport();
        return this.exportAssessmentAnswers(options)
                .then((answers) => {
                    if (answers.length) {
                        return csvConverter.dataToCSV(answers);
                    }
                    return '';
                });
    }


    exportAssessmentAnswersCSV(options = {}) {
        const csvConverter = new CSVConverterExport();
        return this.getAssessmentAnswersList(options)
                .then((assessments) => {
                    if (assessments.length) {
                        let csv = csvConverter.dataToCSV(assessments);
                        return csv;
                    }
                    return '';
                });
    }

    importAssessmentAnswers(stream, maps) {
        const { assessmentIdMap } = maps;
        const converter = new ImportCSVConverter({ checkType: false });
        return converter.streamToRecords(stream)
            .then(records => records.map(record => {
                r.assessmentId = assessmentIdMap[r.id];
                return r;
            }))
            .then(records => this.db.AssessmentAnswers.bulkCreate(records));
    }
};
