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
        name: 'recregtest',
        poolIdle: 1000,
    },
    tmpDirectory: path.join(__dirname, '../test/generated'),
    cohortBucket: 'recregtest',
    constantContact: {
        baseApiUrl: 'http://turnip.test',
        token: 'turnip',
        apiKey: 'turnip api',
        secret: 'secret turnip',
        listId: 42,
    },
};
