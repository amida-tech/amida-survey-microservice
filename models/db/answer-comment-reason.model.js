'use strict';

module.exports = function answerCommentReason(sequelize, Sequelize, schema) {
    const tableName = 'answer_comment_reason';
    const modelName = `${schema}_${tableName}`;
    return sequelize.define(modelName, {
        name: {
            type: Sequelize.TEXT,
            allowNull: false,
            primaryKey: true,
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
        },
    }, {
        freezeTableName: true,
        tableName,
        schema,
        createdAt: 'createdAt',
        updatedAt: false,
        hooks: {
            afterSync(options) {
                if (options.force) {
                    const names = ['agree', 'disagree'];
                    return this.bulkCreate(names.map(name => ({ name })));
                }
                return null;
            },
        },
    });
};
