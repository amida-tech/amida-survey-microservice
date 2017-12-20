'use strict';

module.exports = function answerComment(sequelize, Sequelize, schema) {
    const tableName = 'answer_comment';
    const modelName = `${schema}_${tableName}`;
    return sequelize.define(modelName, {
        assessmentId: {
            type: Sequelize.INTEGER,
            field: 'assessment_id',
            references: {
                model: {
                    schema,
                    tableName: 'assessment',
                },
                key: 'id',
            },
        },
        surveyId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: 'survey_id',
            references: {
                model: {
                    schema,
                    tableName: 'survey',
                },
                key: 'id',
            },
        },
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: 'user_id',
        },
        questionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: 'question_id',
            references: {
                model: {
                    schema,
                    tableName: 'question',
                },
                key: 'id',
            },
        },
        reason: {
            type: Sequelize.TEXT,
            allowNull: false,
            field: 'reason',
            references: {
                model: {
                    schema,
                    tableName: 'answer_comment_reason',
                },
                key: 'name',
            },
        },
        text: {
            type: Sequelize.TEXT,
        },
        language: {
            type: Sequelize.TEXT,
            allowNull: false,
            field: 'language_code',
            references: {
                model: {
                    schema,
                    tableName: 'language',
                },
                key: 'code',
            },
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
            defaultValue: sequelize.literal('NOW()'),
        },
        deletedAt: {
            type: Sequelize.DATE,
            field: 'deleted_at',
        },
    }, {
        freezeTableName: true,
        tableName,
        schema,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: false,
        deletedAt: 'deletedAt',
        paranoid: true,
        indexes: [{
            fields: ['assessment_id', 'question_id'], where: { deleted_at: { $eq: null } },
        }],
    });
};
