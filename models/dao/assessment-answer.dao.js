'use strict';

const _ = require('lodash');

const Base = require('./base');
const SurveyError = require('../../lib/survey-error');
const SPromise = require('../../lib/promise');
const queryrize = require('../../lib/queryrize');

const CSVConverterExport = require('../../export/csv-converter');

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

    exportAssessmentAnswers(options) {
        const surveyId = options.surveyId;
        const questionId = options.questionId;
        // TODO: const sectionId = options.sectionId;
        // TODO: const userIds = options.userIds


        if (!surveyId) {
            SurveyError.reject('surveyMustBeSpecified');
        }

        return this.db.SurveyText.findAll({
            where: { survey_id: surveyId },
            raw: true,
            attributes: ['name', 'surveyId']
        }).then(surveys => {
            return this.db.AssessmentSurvey.findAll({
                where: { survey_id: surveyId },
                raw: true,
                attributes: ['assessmentId', 'surveyId'],
            }).then(surveyAssessments => {
                const assessmentIds = surveyAssessments.map(r => r.assessmentId);
                const newOptions = { surveyId,
                                     assessmentIds,
                                     questionIds: [questionId],
                                     scope: 'export',
                                     meta:true,
                                     createdAt:true };
                return this.answer.listAnswers(newOptions)
                    .then(answers => this.db.Assessment.findAll({
                        where: { id: { $in: assessmentIds } },
                        raw: true,
                        attributes: ['id', 'group', 'stage'],
                    }).then(assessments => this.db.QuestionText.findAll({
                        where: {id: {$in: [questionId]}},
                        raw:true,
                        attributes:['id','text', 'instruction']
                    }).then(questionTexts => {
                        const qTextsMapInput = questionTexts.map(r => [r.id, {text:r.text,instruction:r.instruction}]);
                        const qTextsMap = new Map(qTextsMapInput);
                        const surveyNames = surveys.map(r =>[r.surveyId,r.name]);
                        const surveyNameMap = new Map(surveyNames);
                        const assessmentMapInput = assessments.map(r => [r.id, {group:r.group,stage:r.stage}]);
                        const assessmentMap = new Map(assessmentMapInput);

                        const latestAssessments = new Map();
                        answers = answers.map(a => {
                            a = Object.assign(a, {
                                group:assessmentMap.get(a.assessmentId).group,
                                stage:assessmentMap.get(a.assessmentId).stage,
                                surveyName: surveyNameMap.get(surveyId),
                                weight:null,
                                date: a.createdAt.slice(0,10),
                                questionText: qTextsMap.get(a.questionId).text,
                                questionInstruction: qTextsMap.get(a.questionId).instruction
                            });
                            delete a.createdAt;
                            return a;
                        });

                        assessments.forEach((a) => {
                            if ((latestAssessments[a.group] &&
                                a.stage > latestAssessments[a.group].stage) ||
                                !latestAssessments[a.group]) {
                                latestAssessments[a.group] = a;
                            }
                        });


                        if(answers.length && _.some(answers, a => !!a.questionChoiceId)) {
                            return this.question.questionChoice.getAllQuestionChoices(newOptions.questionIds)
                                .then(res => {

                                    let choiceMapInput = res.map(r => [r.id, r.text])//_.groupBy(res, curr => curr.id);
                                    let choiceTextMap = new Map(choiceMapInput);
                                    let answersWithValues = answers.map(a => {
                                        a = Object.assign(a,{ value: choiceTextMap.get(a.questionChoiceId) });
                                        delete a.questionChoiceId;
                                        return a;
                                    })

                                    const final = answersWithValues.filter(a => a.assessmentId === latestAssessments[a.group].id);
                                    return _.sortBy(final, a => a.assessmentId);
                                });

                        } else {
                            const final = answers.filter((a) => {
                                const group = assessmentMap.get(a.assessmentId).group;
                                return a.assessmentId === latestAssessments[group].id;
                            });

                            return _.sortBy(final, a => a.assessmentId);
                        }
                    })));

            });
        });

    }

    exportAssessmentAnswersCSV(options) {
        const csvConverter = new CSVConverterExport();
        return this.exportAssessmentAnswers(options)
            .then(answers => answers.length ? csvConverter.dataToCSV(answers) : "");
    }
};
