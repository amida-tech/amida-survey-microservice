'use strict';

module.exports = function Link(sequelize, Sequelize, schema) {
    const tableName = 'link';

    const modelName = `${schema}_${tableName}`;
    return sequelize.define(modelName, {
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: 'user_id',
        },
        url: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        displayTypeId: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        field1: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        field2: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        sourceDate: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
        },
        questionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: 'question_id',
        },

    }, {
        freezeTableName: true,
        tableName,
        schema,
        createdAt: 'createdAt',
        updatedAt: false,
    });
};
