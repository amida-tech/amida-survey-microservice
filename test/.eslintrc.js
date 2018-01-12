'use strict';

module.exports = {
    extends: '../.eslintrc',
    rules: {
        'import/no-extraneous-dependencies': [
            'error',
            { devDependencies: true },
        ],
    },
};
