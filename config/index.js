'use strict';

const dotenv = require('dotenv');


if (process.env.NODE_ENV === 'test') {
    console.log('using env.test'); // eslint-disable-line no-console
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

const _ = require('lodash');

const developmentEnv = require('./development');
const testEnv = require('./test');
const productionEnv = require('./production');

const all = {
    env: 'development',
    cors: {
        origin: 'http://localhost:4000',
    },
    db: {
        name: 'surveyService',
        host: 'localhost',
        port: '5432',
        dialect: 'postgres',
        poolMax: 5,
        poolMin: 0,
        poolIdle: 10000,
        schema: 'public',
        ssl: false,
    },
    superUser: {
        username: 'super',
        password: 'Am!d@2017PW',
        email: 'survey_demo@amida.com',
    },
    logging: {
        level: 'info',
    },
    crypt: {
        hashrounds: 10,
        resetTokenLength: 20,
        resetPasswordLength: 10,
        resetExpires: 3600,
        resetExpiresUnit: 'seconds',
    },
    tmpDirectory: '/tmp',

};

const main = {
    env: process.env.NODE_ENV,
    cors: {
        origin: process.env.SURVEY_SERVICE_CORS_ORIGIN,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
    },
    port: process.env.SURVEY_SERVICE_PORT || 9005,
    db: {
        name: process.env.SURVEY_SERVICE_PG_DB,
        user: process.env.SURVEY_SERVICE_PG_USER,
        pass: process.env.SURVEY_SERVICE_PG_PASSWORD,
        host: process.env.SURVEY_SERVICE_PG_HOST,
        port: process.env.SURVEY_SERVICE_PG_PORT,
        dialect: process.env.SURVEY_SERVICE_DB_DIALECT,
        poolMax: process.env.SURVEY_SERVICE_PG_POOL_MAX,
        poolMin: process.env.SURVEY_SERVICE_PG_POOL_MIN,
        poolIdle: process.env.SURVEY_SERVICE_PG_POOL_IDLE,
        schema: process.env.SURVEY_SERVICE_PG_SCHEMA,
        ssl: process.env.SURVEY_SERVICE_PG_SSL,
    },
    superUser: {
        username: process.env.SURVEY_SERVICE_SUPER_USER_USERNAME,
        password: process.env.SURVEY_SERVICE_SUPER_USER_PASSWORD,
        email: process.env.SURVEY_SERVICE_SUPER_USER_EMAIL,
    },
    logging: {
        level: process.env.SURVEY_SERVICE_LOGGING_LEVEL,
    },
    crypt: {
        hashrounds: process.env.SURVEY_SERVICE_CRYPT_HASHROUNDS,
        resetTokenLength: process.env.SURVEY_SERVICE_CRYPT_RESET_TOKEN_LENGTH,
        resetPasswordLength: process.env.SURVEY_SERVICE_CRYPT_RESET_PASSWORD_LENGTH,
        resetExpires: process.env.SURVEY_SERVICE_CRYPT_RESET_EXPIRES,
        resetExpiresUnit: process.env.SURVEY_SERVICE_CRYPT_RESET_EXPIRES_UNIT,
    },
    tmpDirectory: process.env.SURVEY_SERVICE_TMP_DIRECTORY,
    clientBaseUrl: process.env.AUTH_MICROSERVICE_URL,
};

const configBase = _.merge(all, main);
const envBase = {
    development: developmentEnv,
    test: testEnv,
    production: productionEnv,
};
const config = _.merge(configBase, envBase[configBase.env]);

process.env.NODE_ENV = config.env;

module.exports = config;
