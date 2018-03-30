'use strict';

const path = require('path');

module.exports = {
    jwt: {
        secret: '0a6b944d-d2fb-46fc-a85e-0295c986cd9f',
    },
    cors: {
        origin: '*',
    },
    db: {
        name: 'surveyServicetest',
        poolIdle: 1000,
    },
    tmpDirectory: path.join(__dirname, '../test/generated'),
    cohortBucket: 'surveyService',
};
